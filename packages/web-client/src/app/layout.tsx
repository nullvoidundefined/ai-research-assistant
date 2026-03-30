import DocBar from '@/components/DocBar/DocBar';
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import Providers from '@/components/Providers/Providers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';

import './globals.scss';

export const metadata: Metadata = {
  title: 'AI Research Assistant',
  description: 'Save, organize, and chat with your knowledge base',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
        <DocBar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
