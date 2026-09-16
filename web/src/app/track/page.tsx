'use client';

import { type FormEvent, type MouseEvent, useEffect, useState } from 'react';
import { BottomBar, Field, Row, Rows, SHOP, StatusBadge, TopBar, btn, card, input, thaiDateTime } from '@/components/ui';
import { ApiError, type TrackedOrder, lookupOrder } from '@/lib/api';
import { drop, load } from '@/lib/session';

type Query = { orderNumber: string; email: string };
type View = 'init' | 'search' | 'notFound' | 'failed' | 'limited' | { result: TrackedOrder };

const empty: Query = { orderNumber: '', email: '' };

// App Inventor's WebViewer can't save files: hand the link to the app (WebViewStringChange), which opens it in the browser.
function openOutsideAppInventor(e: MouseEvent<HTMLAnchorElement>) {
  const appInventor = (window as { AppInventor?: { setWebViewString(value: string): void } }).AppInventor;
  if (!appInventor) return;
  e.preventDefault();
  appInventor.setWebViewString(e.currentTarget.href);
}

// 06 ORDER TRACKING: A search · B result · C not found
export default function TrackPage() {
  const [query, setQuery] = useState<Query>(empty);
  const [view, setView] = useState<View>('init');
  const [busy, setBusy] = useState(false);

  async function search(q: Query) {
    setBusy(true);
    try {
      setView({ result: await lookupOrder(q) });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setView(status === 404 || status === 400 ? 'notFound' : status === 429 ? 'limited' : 'failed');
    } finally {
      setBusy(false);
    }
  }

  // From 05 "ติดตามคำสั่งซื้อ": prefilled, straight to the result
  useEffect(() => {
    const prefill = load<Query>('track');
    drop('track');
    if (prefill) {
      setQuery(prefill);
      search(prefill);
    } else {
      setView('search');
    }
  }, []);

  function newSearch() {
    setQuery(empty);
    setView('search');
  }

  if (view === 'init') return null;
  if (typeof view === 'object') return <Result order={view.result} onNewSearch={newSearch} />;

  const notFound = view === 'notFound';
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    search(query);
  };
  const set = (key: keyof Query) => (e: { target: { value: string } }) => setQuery({ ...query, [key]: e.target.value });

  return (
    <>
      <TopBar title="ติดตามคำสั่งซื้อ" back="/" />
      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4">
          {notFound ? (
            <div role="alert" className="flex gap-2.5 rounded-[10px] border-2 border-err bg-err-bg p-3.5 text-err-ink">
              <span aria-hidden className="font-mono">✕</span>
              <div className="flex flex-col gap-1">
                <strong className="font-semibold">ไม่พบคำสั่งซื้อ</strong>
                <p className="text-[13px] leading-relaxed">เลขที่คำสั่งซื้อและอีเมลไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง หรือดูอีเมลยืนยันการสั่งซื้อ</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-dash bg-soft p-3.5">
              <span aria-hidden>🔒</span>
              <p className="text-[13px] leading-relaxed text-muted">
                ต้องกรอกทั้ง <b className="text-ink">เลขที่คำสั่งซื้อ</b> และ <b className="text-ink">อีเมล</b> ให้ตรงกัน เพื่อป้องกันการเข้าถึงข้อมูลของลูกค้าคนอื่น
              </p>
            </div>
          )}
          {view === 'failed' && <p role="alert" className="text-sm text-err">เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
          {view === 'limited' && <p role="alert" className="text-sm text-err">ค้นหาบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่</p>}

          <Field label="เลขที่คำสั่งซื้อ">
            <input
              name="orderNumber"
              required
              maxLength={32}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="เช่น EB-2026-0042"
              value={query.orderNumber}
              onChange={set('orderNumber')}
              aria-invalid={notFound || undefined}
              className={`${input} font-mono`}
            />
          </Field>
          <Field label="อีเมลที่ใช้สั่งซื้อ" error={notFound ? 'ต้องกรอกทั้งสองช่องให้ตรงกับข้อมูลการสั่งซื้อ' : undefined}>
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={query.email}
              onChange={set('email')}
              aria-invalid={notFound || undefined}
              className={input}
            />
          </Field>

          {notFound ? (
            <div className="flex flex-col gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-dash bg-soft p-3.5">
              <strong className="text-[13px] font-semibold">ยังหาไม่เจอ?</strong>
              <p className="text-xs leading-relaxed text-muted">ระบบไม่บอกว่าช่องไหนผิด เพื่อความปลอดภัยของข้อมูลลูกค้า · ติดต่อร้านค้าได้ที่ลิงก์ด้านล่าง</p>
              <a href={`mailto:${SHOP.contactEmail}`} className="self-start py-1 text-[13px] underline">ติดต่อร้านค้า</a>
            </div>
          ) : (
            <>
              <p className="text-xs text-faint">* จำเป็นทั้งสองช่อง ปุ่มค้นหาจะกดได้เมื่อกรอกครบ</p>
              <div className="grid h-[150px] place-items-center rounded-[10px] border-[1.5px] border-dashed border-line text-center text-[13px] text-[#a8a59e]">
                ยังไม่ได้ค้นหา
              </div>
            </>
          )}
        </main>
        <BottomBar>
          <button disabled={busy || !query.orderNumber.trim() || !query.email.trim()} className={btn.primary}>ค้นหา</button>
        </BottomBar>
      </form>
    </>
  );
}

function Result({ order, onNewSearch }: { order: TrackedOrder; onNewSearch: () => void }) {
  return (
    <>
      <TopBar title="ผลการค้นหา" back={onNewSearch} />
      <main className="flex flex-1 flex-col gap-3.5 p-4">
        <div className={`${card} flex flex-col gap-3`}>
          <Rows>
            <Row label="เลขที่คำสั่งซื้อ"><span className="font-mono">{order.orderNumber}</span></Row>
            <Row label="หนังสือ">{order.book.title}</Row>
            <Row label="สถานะ"><StatusBadge status={order.status} /></Row>
          </Rows>
          <div className="flex flex-col gap-2 border-t border-dashed border-line pt-3">
            {order.download ? (
              <a href={order.download.url} className={btn.primary} onClick={openOutsideAppInventor}>ดาวน์โหลด</a>
            ) : (
              <button type="button" disabled className={btn.primary}>
                ดาวน์โหลด <span className="font-mono text-[10px]">DISABLED</span>
              </button>
            )}
            <p className="text-xs text-faint">
              {order.download
                ? `ลิงก์มีอายุจำกัด · หมดอายุ ${thaiDateTime(order.download.expiresAt)}`
                : 'ดาวน์โหลดได้เมื่อสถานะเปลี่ยนเป็น PAID'}
            </p>
          </div>
        </div>
      </main>
      <BottomBar>
        <button type="button" onClick={onNewSearch} className={btn.outline}>ค้นหาใหม่</button>
      </BottomBar>
    </>
  );
}
