import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';

// self-hosted at build time, so the WebView needs no Google Fonts request
const thai = Noto_Sans_Thai({ subsets: ['thai', 'latin'], variable: '--font-thai' });

export const metadata: Metadata = {
  title: 'ร้านอีบุ๊ก',
  description: 'ร้านขายอีบุ๊ก (เดโม)',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light', // keeps Android WebView from auto-darkening the page
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="th" className={thai.variable}>
      <body className="bg-page font-sans text-ink antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white">{children}</div>
      </body>
    </html>
  );
}
