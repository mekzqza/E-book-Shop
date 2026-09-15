'use client';

import { btn } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">เชื่อมต่อระบบไม่สำเร็จ</h1>
      <p className="text-sm text-muted">กรุณาลองใหม่อีกครั้งในอีกสักครู่</p>
      <button type="button" onClick={reset} className={btn.outline}>ลองใหม่</button>
    </main>
  );
}
