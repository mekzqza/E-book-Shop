import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { prisma } from '../src/db.ts';

// Runs against the real database in DATABASE_URL; creates and removes its own book and orders.
const BOOK_ID = 'test-book';
const EMAIL = 'buyer@example.com';
type App = ReturnType<typeof createApp>;

const createOrder = async (app: App) =>
  (await request(app).post('/api/orders').send({ bookId: BOOK_ID, buyerName: 'Test Buyer', buyerEmail: ' Buyer@Example.com ' }).expect(201)).body;
const lookup = (app: App, body: object) => request(app).post('/api/orders/lookup').send(body);

beforeAll(async () => {
  const book = { id: BOOK_ID, title: 'Test book', description: 'test', priceTHB: 99, coverUrl: '/api/covers/book-1.svg', fileKey: 'book-1.pdf', listed: true };
  await prisma.book.upsert({ where: { id: BOOK_ID }, create: book, update: book });
});

afterAll(async () => {
  await prisma.download.deleteMany({ where: { order: { bookId: BOOK_ID } } });
  await prisma.order.deleteMany({ where: { bookId: BOOK_ID } });
  await prisma.book.delete({ where: { id: BOOK_ID } });
  await prisma.$disconnect();
});

describe('POST /api/orders/lookup', () => {
  const app = createApp();

  it('finds an order with the matching number + email pair, ignoring case and spaces', async () => {
    const order = await createOrder(app);
    expect(order.orderNumber).toMatch(/^EB-\d{4}-\d{4,}$/);
    const res = await lookup(app, { orderNumber: ` ${order.orderNumber.toLowerCase()} `, email: 'BUYER@example.com' }).expect(200);
    expect(res.body).toMatchObject({ orderNumber: order.orderNumber, status: 'PENDING', download: null });
    expect(res.body).not.toHaveProperty('buyerEmail');
  });

  it('returns an identical 404 for a wrong email and for an order number that does not exist', async () => {
    const order = await createOrder(app);
    const wrongEmail = await lookup(app, { orderNumber: order.orderNumber, email: 'someone@else.com' });
    const noSuchOrder = await lookup(app, { orderNumber: 'EB-1999-999999', email: EMAIL });
    expect(wrongEmail.status).toBe(404);
    expect(noSuchOrder.status).toBe(404);
    expect(wrongEmail.body).toEqual(noSuchOrder.body);
    expect(wrongEmail.headers['content-length']).toBe(noSuchOrder.headers['content-length']);
  });

  it('requires both fields and rejects unknown ones', async () => {
    const bodies = [{ orderNumber: 'EB-2026-0001' }, { email: EMAIL }, {}, { orderNumber: 'EB-2026-0001', email: EMAIL, id: 'x' }];
    for (const body of bodies) expect((await lookup(app, body)).status).toBe(400);
  });

  it('is rate limited', async () => {
    const fresh = createApp();
    const statuses = [];
    for (let i = 0; i < 21; i++) statuses.push((await lookup(fresh, { orderNumber: 'EB-1999-0000', email: EMAIL })).status);
    expect(statuses.slice(0, 20)).toEqual(Array(20).fill(404));
    expect(statuses[20]).toBe(429);
  });
});

describe('POST /api/orders', () => {
  it('rejects unknown fields, so a client cannot set status or orderNumber', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/orders')
      .send({ bookId: BOOK_ID, buyerName: 'x', buyerEmail: EMAIL, status: 'PAID' });
    expect(res.status).toBe(400);
  });
});

describe('catalog', () => {
  it('hides unlisted books and refuses new orders for them', async () => {
    const app = createApp();
    await prisma.book.update({ where: { id: BOOK_ID }, data: { listed: false } });
    try {
      const list = await request(app).get('/api/books').expect(200);
      expect(list.body.map((b: { id: string }) => b.id)).not.toContain(BOOK_ID);
      await request(app).get(`/api/books/${BOOK_ID}`).expect(404);
      await request(app).post('/api/orders').send({ bookId: BOOK_ID, buyerName: 'x', buyerEmail: EMAIL }).expect(404);
    } finally {
      await prisma.book.update({ where: { id: BOOK_ID }, data: { listed: true } });
    }
  });

  it('serves covers but never the PDFs next to them', async () => {
    const app = createApp();
    await request(app).get('/api/covers/book-1.svg').expect(200);
    await request(app).get('/api/covers/book-1.pdf').expect(404);
    await request(app).get('/api/covers/%2e%2e%2fbook-1.pdf').expect(404);
  });
});

describe('POST /api/orders/:id/mock-pay', () => {
  it('is idempotent: concurrent and repeated calls issue exactly one token', async () => {
    const app = createApp();
    const order = await createOrder(app);
    const results = await Promise.all([1, 2, 3].map(() => request(app).post(`/api/orders/${order.id}/mock-pay`)));
    for (const r of results) expect(r.body.status).toBe('PAID');
    const first = await prisma.download.findUniqueOrThrow({ where: { orderId: order.id } });
    await request(app).post(`/api/orders/${order.id}/mock-pay`).expect(200);
    const downloads = await prisma.download.findMany({ where: { orderId: order.id } });
    expect(downloads).toHaveLength(1);
    expect(downloads[0].token).toBe(first.token);
  });

  it('is rate limited', async () => {
    const app = createApp();
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await request(app).post('/api/orders/nope/mock-pay')).status);
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(404));
    expect(statuses[10]).toBe(429);
  });
});

describe('GET /api/download/:token', () => {
  it('serves a valid token, refuses the order id and expired tokens, and lookup renews an expired link', async () => {
    const app = createApp();
    const order = await createOrder(app);
    await request(app).post(`/api/orders/${order.id}/mock-pay`).expect(200);
    const paid = await lookup(app, { orderNumber: order.orderNumber, email: EMAIL }).expect(200);
    const token = paid.body.download.url.split('/').pop();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);

    const file = await request(app).get(`/api/download/${token}`).expect(200);
    expect(file.headers['content-disposition']).toMatch(/^attachment/);
    expect((await prisma.download.findUniqueOrThrow({ where: { token } })).usedAt).not.toBeNull();

    await request(app).get(`/api/download/${order.id}`).expect(404);

    await prisma.download.update({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await request(app).get(`/api/download/${token}`).expect(404);
    const renewed = await lookup(app, { orderNumber: order.orderNumber, email: EMAIL }).expect(200);
    expect(renewed.body.download.url).not.toBe(paid.body.download.url);
    expect(new Date(renewed.body.download.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
