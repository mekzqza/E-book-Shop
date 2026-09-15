import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASS, SMTP_FROM = 'E-book Shop <no-reply@ebook.local>' } = process.env;

const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_PORT === '465',
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

type DownloadEmail = { orderNumber: string; bookTitle: string; url: string; expiresAt: Date };

export async function sendDownloadEmail(to: string, { orderNumber, bookTitle, url, expiresAt }: DownloadEmail) {
  const expires = expiresAt.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'short' });
  const mail = {
    from: SMTP_FROM,
    to,
    subject: `ลิงก์ดาวน์โหลด ${bookTitle} (${orderNumber})`,
    text: [
      'ขอบคุณสำหรับการสั่งซื้อ',
      '',
      `เลขที่คำสั่งซื้อ: ${orderNumber}`,
      `หนังสือ: ${bookTitle}`,
      '',
      `ดาวน์โหลด: ${url}`,
      `ลิงก์หมดอายุ: ${expires} (24 ชั่วโมง, ${expiresAt.toISOString()})`,
      '',
      'หากลิงก์หมดอายุ ขอลิงก์ใหม่ได้ที่หน้าติดตามคำสั่งซื้อ ด้วยเลขที่คำสั่งซื้อและอีเมลนี้',
    ].join('\n'),
  };
  if (!transport) {
    console.log(`[email] SMTP not configured, logging instead of sending\nFrom: ${mail.from}\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n[/email]`);
    return;
  }
  await transport.sendMail(mail);
}
