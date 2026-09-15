import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Book, OrderStatus } from '@/lib/api';

export const SHOP = { name: 'ร้านอีบุ๊ก', tagline: 'อ่านได้ทันทีหลังชำระเงิน', contactEmail: 'support@example.com' };

export const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`;
export const thaiDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });

const disabledLook = 'disabled:border-2 disabled:border-dashed disabled:border-[#c9c7c2] disabled:bg-[#f2f0ec] disabled:text-[#a8a59e]';
export const btn = {
  primary: `flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-[17px] text-white ${disabledLook}`,
  outline: 'flex min-h-[50px] w-full items-center justify-center rounded-[10px] border-2 border-ink bg-white px-4 text-base text-ink',
  dashed: 'flex min-h-[50px] w-full items-center justify-center rounded-[10px] border-2 border-dashed border-dash px-4 text-base text-muted',
  small: 'flex h-[38px] min-w-[76px] shrink-0 items-center justify-center rounded-[9px] bg-ink px-4 text-[15px] text-white',
};
export const input =
  'h-12 w-full rounded-lg border-[1.5px] border-dash bg-white px-3 text-base text-ink placeholder:text-[#a8a59e] focus:border-ink focus:outline-2 focus:outline-offset-1 focus:outline-ink user-invalid:border-2 user-invalid:border-err aria-invalid:border-2 aria-invalid:border-err';
export const card = 'rounded-[10px] border-[1.5px] border-ink p-3.5';

export function TopBar({ title, back }: { title: string; back: string | (() => void) }) {
  const cls = 'grid size-11 shrink-0 place-items-center text-3xl leading-none';
  return (
    <header className="sticky top-0 z-10 flex items-center gap-1 border-b-[1.5px] border-ink bg-white py-1 pr-4 pl-1">
      {typeof back === 'string' ? (
        <Link href={back} aria-label="ย้อนกลับ" className={cls}>‹</Link>
      ) : (
        <button type="button" onClick={back} aria-label="ย้อนกลับ" className={cls}>‹</button>
      )}
      <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
    </header>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 border-t-[1.5px] border-ink bg-soft px-4 pt-3 pb-4">{children}</div>;
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const color = status === 'PAID' ? 'border-paid-line bg-paid-bg text-paid-ink' : 'border-pending-line bg-pending-bg text-pending-ink';
  return <span className={`inline-block rounded-full border-[1.5px] px-3 py-1 font-mono text-[13px] leading-tight tracking-[0.06em] ${color}`}>{status}</span>;
}

export function Cover({ book, className = '' }: { book: Pick<Book, 'title' | 'coverUrl'>; className?: string }) {
  return (
    // plain <img>: covers are small static SVGs, nothing for next/image to optimize
    <img src={book.coverUrl} alt={`ปก ${book.title}`} width={220} height={296} className={`aspect-[110/148] h-auto shrink-0 rounded-[4px] ${className}`} />
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-dashed divide-line">{children}</dl>;
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right wrap-anywhere">{children}</dd>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-muted">
      <span>
        {label} <span className="text-err">*</span>
      </span>
      {children}
      {hint && <small className="text-xs">{hint}</small>}
      {error && <small className="text-xs text-err">{error}</small>}
    </label>
  );
}
