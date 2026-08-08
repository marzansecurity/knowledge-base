import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';
import { VertalingProvider } from '@/components/vertaling-provider';
import { isTaal, TALEN } from '@/lib/talen';
import { haalVertalingen } from '@/lib/vertalingen';

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Marzan Kennisbank',
  description: 'Interne kennisbank van Marzan Security',
};

export function generateStaticParams() {
  return TALEN.map((taal) => ({ taal }));
}

export default async function RootLayout({ children, params }: LayoutProps<'/[taal]'>) {
  const { taal } = await params;
  if (!isTaal(taal)) notFound();

  const berichten = await haalVertalingen(taal);

  return (
    <html lang={taal} className={`${openSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <VertalingProvider taal={taal} berichten={berichten}>
          {children}
        </VertalingProvider>
      </body>
    </html>
  );
}
