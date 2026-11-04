import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { AppearanceProvider } from '@/components/layout/AppearanceProvider';
import { AppSessionProvider } from '@/context/AppSessionContext';
import { SystemNoticeHost } from '@/components/System/SystemNoticeHost';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
  display: 'swap'
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap'
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
      data-theme="navy"
      data-font="jakarta"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('hesu_ui_theme');var f=localStorage.getItem('hesu_ui_font');document.documentElement.dataset.theme=(t==='midnight'||t==='navy'||t==='light')?t:'navy';if(f==='jakarta'||f==='inter'||f==='ibm-plex'||f==='outfit'||f==='source-serif')document.documentElement.dataset.font=f;}catch(e){}"
          }}
        />
      </head>
      <body className="h-dvh overflow-hidden bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
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
