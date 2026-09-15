'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useRef } from 'react';
import { BottomBar, Field, btn, input } from '@/components/ui';
import { type Draft, load, save } from '@/lib/session';

export default function BuyerForm({ bookId, children }: { bookId: string; children: ReactNode }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);

  // Coming back from 03 via "แก้ไข" keeps what the buyer already typed
  useEffect(() => {
    const draft = load<Draft>('draft');
    if (!draft || !form.current) return;
    for (const name of ['buyerName', 'buyerEmail'] as const) {
      (form.current.elements.namedItem(name) as HTMLInputElement).value = draft[name];
    }
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // native required/email validation has already passed at this point
    const data = new FormData(e.currentTarget);
    save('draft', { bookId, buyerName: String(data.get('buyerName')).trim(), buyerEmail: String(data.get('buyerEmail')).trim() } satisfies Draft);
    router.push(`/books/${bookId}/summary`);
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-3.5 p-4">
        {children}
        <section className="flex flex-col gap-3 border-t-[1.5px] border-ink pt-3">
          <h2 className="font-semibold">ข้อมูลผู้ซื้อ</h2>
          <Field label="ชื่อ-นามสกุล">
            <input name="buyerName" required maxLength={120} autoComplete="name" className={input} />
          </Field>
          <Field label="อีเมล" hint="ลิงก์ดาวน์โหลดจะถูกส่งไปที่อีเมลนี้ · โปรดตรวจสอบให้ถูกต้อง">
            <input name="buyerEmail" type="email" required maxLength={254} autoComplete="email" className={input} />
          </Field>
        </section>
      </main>
      <BottomBar>
        <button className={btn.primary}>ดำเนินการต่อ</button>
      </BottomBar>
    </form>
  );
}
