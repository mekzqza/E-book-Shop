'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { BottomBar, Row, Rows, baht, btn, card } from '@/components/ui';
import { type Book, createOrder } from '@/lib/api';
import { type Draft, load, save } from '@/lib/session';

export default function Summary({ book }: { book: Book }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  useEffect(() => {
    const saved = load<Draft>('draft');
    if (saved?.bookId === book.id) setDraft(saved);
    else router.replace(`/books/${book.id}`); // no buyer data yet: fill the form first
  }, [book.id, router]);

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setStatus('sending');
    try {
      const order = await createOrder(draft);
      save(`order:${order.id}`, order);
      router.replace(`/orders/${order.id}`); // replace: Back must not land on a summary that re-creates the order
    } catch {
      setStatus('error');
    }
  }

  if (!draft) return null;

  return (
    <form onSubmit={confirm} className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-3.5 p-4">
        <p className="text-[13px] text-muted">ตรวจสอบข้อมูลก่อนยืนยันคำสั่งซื้อ</p>
        <div className={card}>
          <Rows>
            <Row label="หนังสือ">{book.title}</Row>
            <Row label="ราคา"><span className="text-lg font-semibold">{baht(book.priceTHB)}</span></Row>
            <Row label="ชื่อผู้ซื้อ">{draft.buyerName}</Row>
            <Row label="อีเมล">{draft.buyerEmail}</Row>
          </Rows>
        </div>
        <Link href={`/books/${book.id}`} className="self-start py-1 text-[13px] underline">แก้ไข</Link>
        <div className="flex items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-dashed border-dash p-3.5">
          <span>ยอดชำระ</span>
          <span className="text-2xl font-semibold">{baht(book.priceTHB)}</span>
        </div>
        <p className="text-xs text-faint">สินค้าดิจิทัล · ไม่มีค่าจัดส่ง</p>
        {status === 'error' && (
          <p role="alert" className="text-sm text-err">สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
        )}
      </main>
      <BottomBar>
        <button disabled={status === 'sending'} className={btn.primary}>ยืนยันคำสั่งซื้อ</button>
      </BottomBar>
    </form>
  );
}
