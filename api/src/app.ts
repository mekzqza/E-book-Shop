import { randomBytes } from 'node:crypto';
import path from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from './db.ts';
import { sendDownloadEmail } from './email.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const FILES_DIR = path.resolve(process.env.FILES_DIR ?? 'files');
const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:4000';

// fileKey is deliberately absent: it never leaves the API
const bookFields = { id: true, title: true, description: true, priceTHB: true, coverUrl: true } as const;

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const createOrderBody = z.strictObject({
  bookId: z.string().min(1).max(64),
  buyerName: z.string().trim().min(1).max(120),
  buyerEmail: email,
});
const lookupBody = z.strictObject({
  orderNumber: z.string().trim().toUpperCase().min(1).max(32),
  email,
});

const newToken = () => randomBytes(32).toString('base64url');
const downloadUrl = (token: string) => `${PUBLIC_API_URL}/api/download/${token}`;

const limit = (max: number) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'RATE_LIMITED' } });

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind nginx: req.ip is the real client, which the rate limiters key on
  app.use(express.json({ limit: '10kb' }));
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Local dev only (web :3000 -> api :4000 without nginx). Unset in docker, where nginx owns CORS.
  const devOrigin = process.env.CORS_ORIGIN;
  if (devOrigin) {
    app.use((req, res, next) => {
      if (req.headers.origin === devOrigin) {
        res.set({ 'Access-Control-Allow-Origin': devOrigin, 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' });
      }
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
  }

  app.get('/api/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  });

  app.get('/api/books', async (_req, res) => {
    res.json(await prisma.book.findMany({ select: bookFields, orderBy: { id: 'asc' } }));
  });

  app.get('/api/books/:id', async (req, res) => {
    const book = await prisma.book.findUnique({ where: { id: req.params.id }, select: bookFields });
    if (!book) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    res.json(book);
  });

  app.post('/api/orders', async (req, res) => {
    const body = createOrderBody.parse(req.body);
    const book = await prisma.book.findUnique({ where: { id: body.bookId }, select: { id: true } });
    if (!book) {
      res.status(404).json({ error: 'BOOK_NOT_FOUND' });
      return;
    }
    const [{ n }] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
    const order = await prisma.order.create({
      data: { ...body, orderNumber: `EB-${new Date().getFullYear()}-${String(n).padStart(4, '0')}` },
      include: { book: { select: bookFields } },
    });
    res.status(201).json(order);
  });

  app.post('/api/orders/lookup', limit(20), async (req, res) => {
    const { orderNumber, email } = lookupBody.parse(req.body);
    // One query on both fields: a wrong email and an unknown number take the same path and get the same 404.
    const order = await prisma.order.findFirst({
      where: { orderNumber, buyerEmail: email },
      include: { book: { select: bookFields }, download: true },
    });
    if (!order) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    let dl = order.download;
    if (dl && dl.expiresAt <= new Date()) {
      // Expired link: the owner (number + email) gets a fresh token on the same row.
      dl = await prisma.download.update({
        where: { id: dl.id },
        data: { token: newToken(), expiresAt: new Date(Date.now() + DAY_MS), usedAt: null },
      });
    }
    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      book: order.book,
      download: dl && { url: downloadUrl(dl.token), expiresAt: dl.expiresAt },
    });
  });

  app.post('/api/orders/:id/mock-pay', limit(10), async (req, res) => {
    const id = String(req.params.id);
    const paidAt = new Date();
    const token = newToken();
    // Only the call that flips PENDING -> PAID issues a token. Repeats and concurrent calls match 0 rows;
    // Download.orderId @unique backs this up at the DB level.
    const paidNow = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PAID', paidAt } });
      if (count === 1) await tx.download.create({ data: { orderId: id, token, expiresAt: new Date(paidAt.getTime() + DAY_MS) } });
      return count === 1;
    });
    const order = await prisma.order.findUnique({
      where: { id },
      include: { book: { select: bookFields }, download: { select: { expiresAt: true } } },
    });
    if (!order) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    if (paidNow) {
      // Payment is already committed; a mail failure must not fail it. The link stays reachable via lookup.
      await sendDownloadEmail(order.buyerEmail, {
        orderNumber: order.orderNumber,
        bookTitle: order.book.title,
        url: downloadUrl(token),
        expiresAt: order.download!.expiresAt,
      }).catch((err) => console.error(`[email] failed for ${order.orderNumber}:`, err));
    }
    res.json(order);
  });

  app.get('/api/download/:token', async (req, res) => {
    const dl = await prisma.download.findUnique({ where: { token: req.params.token }, include: { order: { include: { book: true } } } });
    if (!dl || dl.expiresAt <= new Date()) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    if (!dl.usedAt) await prisma.download.update({ where: { id: dl.id }, data: { usedAt: new Date() } });
    const { book } = dl.order;
    res.download(path.join(FILES_DIR, path.basename(book.fileKey)), `${book.title}${path.extname(book.fileKey)}`);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
      return;
    }
    const status = err.status ?? err.statusCode; // body-parser: 400 bad JSON, 413 too large; send: 404 missing file
    if (status >= 400 && status < 500) {
      res.status(status).json({ error: err.type ?? 'BAD_REQUEST' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'INTERNAL' });
  };
  app.use(onError);

  return app;
}
