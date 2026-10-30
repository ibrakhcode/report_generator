import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans, Inter, JetBrains_Mono, Outfit, Plus_Jakarta_Sans, Source_Serif_4 } from 'next/font/google';
import { AppearanceProvider } from '@/components/layout/AppearanceProvider';
import { AppSessionProvider } from '@/context/AppSessionContext';
import { SystemNoticeHost } from '@/components/System/SystemNoticeHost';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800']
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex',
  weight: ['400', '500', '600', '700']
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit'
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600']
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export const metadata: Metadata = {
  title: 'HESU ICT Performance & Reporting Management System',
  description:
    'Enterprise ICT Performance & Reporting Management System to record daily work, IT support tickets, KPI tracking, evidence storage, and generate PowerPoint and PDF monthly reports.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-font="jakarta"
      className={`${plusJakarta.variable} ${inter.variable} ${ibmPlex.variable} ${outfit.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <AppSessionProvider>
          <AppearanceProvider>
            {children}
            <SystemNoticeHost />
          </AppearanceProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
