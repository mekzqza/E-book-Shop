import { notFound } from 'next/navigation';
import { TopBar } from '@/components/ui';
import { ApiError, getBook } from '@/lib/api';
import Summary from './summary';

export const dynamic = 'force-dynamic';

// 03 ORDER SUMMARY
export default async function SummaryPage({ params }: PageProps<'/books/[id]/summary'>) {
  const { id } = await params;
  const book = await getBook(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  return (
    <>
      <TopBar title="สรุปคำสั่งซื้อ" back={`/books/${book.id}`} />
      <Summary book={book} />
    </>
  );
}
