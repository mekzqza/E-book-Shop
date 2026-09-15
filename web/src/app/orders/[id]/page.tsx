'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BottomBar, Row, Rows, StatusBadge, TopBar, baht, btn, card, thaiDateTime } from '@/components/ui';
import { ApiError, type Order, mockPay } from '@/lib/api';
import { load, save } from '@/lib/session';

// 04 MOCK PAYMENT while PENDING, 05 PAYMENT SUCCESS once PAID
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>();

  useEffect(() => {
    setOrder(load<Order>(`order:${id}`));
  }, [id]);

  if (order === undefined) return null;
  if (!order) return <NotInThisTab />;
  if (order.status === 'PAID') return <Success order={order} />;
  return (
    <Payment
      order={order}
      onPaid={(paid) => {
        save(`order:${id}`, paid);
        setOrder(paid);
      }}
    />
  );
}

function DemoBanner() {
  return (
    <div role="alert" className="sticky top-0 z-20 border-b-[3px] border-pending-line bg-pending-bg text-center">
      <div aria-hidden className="h-2.5 bg-[repeating-linear-gradient(-45deg,#1a1a1a_0_10px,#f7cd77_10px_20px)]" />
      <div className="flex flex-col items-center gap-2 px-4 pt-3 pb-3.5">
        <strong className="rounded-lg border-[2.5px] border-[#8a5a00] bg-[#f7cd77] px-4 py-2 font-mono text-xl leading-none tracking-[0.1em] text-[#6b4200]">
          ⚠ DEMO ONLY
        </strong>
        <p className="text-[13px] leading-snug text-[#5e3a00]">
          หน้านี้เป็นการชำระเงินจำลองเพื่อการสาธิตเท่านั้น
          <br />
          ไม่มีการตัดเงินจริง และไม่มีการเก็บข้อมูลบัตร
        </p>
      </div>
    </div>
  );
}

function Payment({ order, onPaid }: { order: Order; onPaid: (order: Order) => void }) {
  const [status, setStatus] = useState<'idle' | 'paying' | 'error' | 'limited'>('idle');

  async function pay() {
    setStatus('paying');
    try {
      onPaid(await mockPay(order.id));
    } catch (err) {
      setStatus(err instanceof ApiError && err.status === 429 ? 'limited' : 'error');
    }
  }

  return (
    <>
      <DemoBanner />
      <main className="flex flex-1 flex-col gap-3.5 p-4">
        <div className={card}>
          <Rows>
            <Row label="เลขที่คำสั่งซื้อ"><span className="font-mono">{order.orderNumber}</span></Row>
            <Row label="สถานะ"><StatusBadge status={order.status} /></Row>
            <Row label="ยอดชำระ"><span className="text-xl font-semibold">{baht(order.book.priceTHB)}</span></Row>
          </Rows>
        </div>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">ช่องทางชำระเงิน</h2>
            <span className="text-[11px] text-muted">ปิดใช้งาน · โหมดสาธิต</span>
          </div>
          {[1, 2].map((n) => (
            <div key={n} aria-hidden className="flex items-center gap-3 rounded-[9px] border-[1.5px] border-dashed border-[#c9c7c2] bg-[#f7f6f3] p-3.5">
              <span className="size-[18px] shrink-0 rounded-full border-[1.5px] border-dash" />
              <span className="h-2.5 flex-1 rounded bg-[#e4e2dc]" />
              <span className="font-mono text-[10px] text-[#a8a59e]">DISABLED</span>
            </div>
          ))}
          <div className="grid h-[120px] place-items-center rounded-[9px] border-[1.5px] border-dashed border-[#c9c7c2] bg-[repeating-linear-gradient(45deg,#f2f0ec_0_6px,#e7e5df_6px_12px)]">
            <span className="bg-white/80 px-2.5 py-1 text-center font-mono text-[11px] text-muted">
              FAKE QR / PAYMENT WIDGET
              <br />
              ไม่มีการเชื่อมต่อระบบชำระเงินจริง
            </span>
          </div>
        </section>

        {status === 'error' && <p role="alert" className="text-sm text-err">ชำระเงินจำลองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
        {status === 'limited' && <p role="alert" className="text-sm text-err">ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่</p>}
      </main>
      <BottomBar>
        <button type="button" onClick={pay} disabled={status === 'paying'} className={btn.primary}>จำลองชำระเงินสำเร็จ</button>
      </BottomBar>
    </>
  );
}

function Success({ order }: { order: Order }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
    } catch {
      // older WebViews / non-secure contexts
      const el = Object.assign(document.createElement('textarea'), { value: order.orderNumber });
      document.body.append(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function track() {
    save('track', { orderNumber: order.orderNumber, email: order.buyerEmail });
    router.push('/track');
  }

  return (
    <>
      <main className="flex flex-1 flex-col items-center gap-4 px-4 pt-7 pb-4 text-center">
        <div aria-hidden className="grid size-[92px] place-items-center rounded-full border-[2.5px] border-paid-line bg-paid-bg text-[44px] text-paid-ink">✓</div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-semibold">ชำระเงินสำเร็จ</h1>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex w-full flex-col items-center gap-2.5 rounded-[10px] border-[1.5px] border-ink p-4">
          <span className="text-xs text-muted">เลขที่คำสั่งซื้อ</span>
          <span className="font-mono text-[26px] leading-tight tracking-[0.02em] wrap-anywhere">{order.orderNumber}</span>
          <button type="button" onClick={copy} className="flex min-h-11 items-center gap-2 rounded-lg border-[1.5px] border-dashed border-dash px-4 text-[13px]">
            <span aria-hidden className="font-mono text-muted">⧉</span>คัดลอก
          </button>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-[10px] border-[1.5px] border-dashed border-dash bg-soft p-3.5 text-left">
          <p className="text-[13px]">ส่งลิงก์ดาวน์โหลดไปที่อีเมลของคุณแล้ว</p>
          <p className="font-mono text-[13px] wrap-anywhere">{order.buyerEmail}</p>
          <p className="text-xs leading-relaxed text-muted">
            ⏱ ลิงก์มีอายุจำกัด (หมดอายุภายใน 24 ชั่วโมง{order.download && ` · ${thaiDateTime(order.download.expiresAt)}`}) หากหมดอายุ
            ให้ขอลิงก์ใหม่จากหน้าติดตามคำสั่งซื้อ
          </p>
        </div>
        <p className="text-xs text-faint">ไม่พบอีเมล? ตรวจสอบกล่องจดหมายขยะ</p>
      </main>

      <BottomBar>
        <button type="button" onClick={track} className={btn.outline}>ติดตามคำสั่งซื้อ</button>
        <Link href="/" className={btn.dashed}>กลับหน้าร้าน</Link>
      </BottomBar>

      <div role="status" className="pointer-events-none fixed bottom-36 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white empty:hidden">
        {copied ? 'คัดลอกแล้ว' : ''}
      </div>
    </>
  );
}

function NotInThisTab() {
  return (
    <>
      <TopBar title="คำสั่งซื้อ" back="/" />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted">ไม่พบข้อมูลคำสั่งซื้อในแท็บนี้ ตรวจสอบสถานะได้ด้วยเลขที่คำสั่งซื้อและอีเมล</p>
        <Link href="/track" className={btn.outline}>ติดตามคำสั่งซื้อ</Link>
      </main>
    </>
  );
}
