import Link from 'next/link';
import { Cover, SHOP, baht, btn } from '@/components/ui';
import { getBooks } from '@/lib/api';

export const dynamic = 'force-dynamic';

// 01 STOREFRONT
export default async function Storefront() {
  const books = await getBooks().catch(() => null);

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b-[1.5px] border-ink px-4 py-3.5">
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-semibold">{SHOP.name}</h1>
          <p className="text-xs text-muted">{SHOP.tagline}</p>
        </div>
        <Link href="/track" className="shrink-0 py-2 text-sm underline">ติดตามคำสั่งซื้อ</Link>
      </header>

      <main className="flex-1 px-4">
        <div className="flex items-baseline justify-between pt-3.5 pb-2">
          <h2 className="font-semibold">หนังสือทั้งหมด</h2>
          {books && <span className="text-xs text-faint">{books.length} เล่ม</span>}
        </div>

        {!books && (
          <p role="alert" className="rounded-[10px] border-2 border-err bg-err-bg p-3.5 text-sm text-err-ink">
            โหลดรายการหนังสือไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        )}

        {books?.map((book) => (
          <article key={book.id} className="flex gap-3 border-t border-dashed border-line py-3.5">
            <Cover book={book} className="w-[110px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="leading-snug font-semibold">{book.title}</h3>
              <p className="line-clamp-3 text-[13px] text-muted">{book.description}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-lg font-semibold">{baht(book.priceTHB)}</span>
                <Link href={`/books/${book.id}`} className={btn.small}>ซื้อ</Link>
              </div>
            </div>
          </article>
        ))}
      </main>

      <footer className="border-t-[1.5px] border-ink px-4 py-3">
        <Link href="/track" className="inline-block py-1 text-[13px] underline">ติดตามคำสั่งซื้อ</Link>
      </footer>
    </>
  );
}
