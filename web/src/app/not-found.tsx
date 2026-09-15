import Link from 'next/link';
import { btn } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="text-sm text-muted">ลิงก์อาจไม่ถูกต้อง หรือหนังสือเล่มนี้ไม่มีในร้านแล้ว</p>
      <Link href="/" className={btn.outline}>กลับหน้าร้าน</Link>
    </main>
  );
}
