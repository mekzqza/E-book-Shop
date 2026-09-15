import { notFound } from 'next/navigation';
import { Cover, TopBar, baht } from '@/components/ui';
import { ApiError, getBook } from '@/lib/api';
import BuyerForm from './buyer-form';

export const dynamic = 'force-dynamic';

// 02 PRODUCT DETAIL + BUYER FORM
export default async function BookPage({ params }: PageProps<'/books/[id]'>) {
  const { id } = await params;
  const book = await getBook(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  return (
    <>
      <TopBar title="รายละเอียดหนังสือ" back="/" />
      <BuyerForm bookId={book.id}>
        <Cover book={book} className="w-[150px] self-center" />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl leading-snug font-semibold">{book.title}</h2>
          <p className="text-2xl font-semibold">{baht(book.priceTHB)}</p>
        </div>
        <section className="flex flex-col gap-1.5 border-t border-dashed border-line pt-2.5">
          <h3 className="text-xs text-muted">รายละเอียด</h3>
          <p className="text-[15px] leading-relaxed">{book.description}</p>
        </section>
      </BuyerForm>
    </>
  );
}
