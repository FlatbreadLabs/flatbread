import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { Shell } from './components/Shell';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'flatbread/docs',
  description:
    'Documentation for Flatbread — relational content for TypeScript apps, read from flat files through a typed graph.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={geistMono.variable}>
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
