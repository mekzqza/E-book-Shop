import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from './db.ts';

// The catalog lives next to the PDFs: files/books.json, files/*.pdf, files/covers/*. Edit them, then re-run this.
const FILES_DIR = path.resolve(process.env.FILES_DIR ?? 'files');
const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:4000';

const fileIn = (dir: string) =>
  z.string().refine((name) => name === path.basename(name) && existsSync(path.join(dir, name)), `not found in ${dir}`);
const catalog = z
  .array(
    z.strictObject({
      id: z.string().regex(/^[a-z0-9-]{1,64}$/, 'lowercase letters, digits and dashes only'), // shows up in /books/:id
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      priceTHB: z.number().int().positive(),
      file: fileIn(FILES_DIR),
      cover: fileIn(path.join(FILES_DIR, 'covers')),
    }),
  )
  .refine((books) => new Set(books.map((b) => b.id)).size === books.length, 'duplicate id');

const parsed = catalog.safeParse(JSON.parse(readFileSync(path.join(FILES_DIR, 'books.json'), 'utf8')));
if (!parsed.success) {
  // Nothing is written: a typo must not put a book on sale whose PDF can't be downloaded.
  console.error(`books.json is invalid, nothing changed:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const books = parsed.data;
await prisma.$transaction([
  ...books.map(({ file, cover, ...book }) => {
    const data = { ...book, fileKey: file, coverUrl: `${PUBLIC_API_URL}/api/covers/${encodeURIComponent(cover)}`, listed: true };
    return prisma.book.upsert({ where: { id: book.id }, create: data, update: data });
  }),
  // Removed from books.json: off the shelf, but earlier buyers keep their orders and downloads.
  prisma.book.updateMany({ where: { id: { notIn: books.map((b) => b.id) } }, data: { listed: false } }),
]);
console.log(`seeded ${books.length} books`);
await prisma.$disconnect();
