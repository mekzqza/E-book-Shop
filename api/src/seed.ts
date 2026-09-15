import { prisma } from './db.ts';

const books = [
  {
    id: 'book-1',
    title: 'ศิลปะแห่งการใช้ชีวิตช้าๆ',
    description:
      'ชวนหยุดพัก หายใจ และกลับมาใส่ใจสิ่งเล็กๆ รอบตัว ผ่านเรื่องเล่าและแบบฝึกหัดสั้นๆ ที่ทำได้ทุกวัน ตั้งแต่การจิบกาแฟอย่างตั้งใจ ไปจนถึงการจัดตารางชีวิตให้มีที่ว่างสำหรับตัวเอง',
    priceTHB: 129,
    coverUrl: '/covers/book-1.svg',
    fileKey: 'book-1.pdf',
  },
  {
    id: 'book-2',
    title: 'ทำอาหารง่ายๆ ในหอพัก',
    description:
      '50 เมนูราคาประหยัดสำหรับคนมีครัวเล็ก ใช้แค่หม้อหุงข้าวและไมโครเวฟ พร้อมเทคนิคจ่ายตลาดรายสัปดาห์และเก็บวัตถุดิบให้อยู่ได้นาน',
    priceTHB: 89,
    coverUrl: '/covers/book-2.svg',
    fileKey: 'book-2.pdf',
  },
  {
    id: 'book-3',
    title: 'เริ่มต้นลงทุนฉบับมือใหม่',
    description:
      'เข้าใจกองทุน หุ้น และดอกเบี้ยทบต้นแบบไม่ปวดหัว ตั้งแต่การตั้งเป้าหมาย การกระจายความเสี่ยง ไปจนถึงการเลือกกองทุนแรก พร้อมตัวอย่างตัวเลขให้ลองคำนวณตาม',
    priceTHB: 159,
    coverUrl: '/covers/book-3.svg',
    fileKey: 'book-3.pdf',
  },
];

for (const book of books) {
  await prisma.book.upsert({ where: { id: book.id }, create: book, update: book });
}
console.log(`seeded ${books.length} books`);
await prisma.$disconnect();
