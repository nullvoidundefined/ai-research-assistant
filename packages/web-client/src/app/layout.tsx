import type { Metadata } from 'next';
import './globals.scss';
import Providers from '@/components/Providers/Providers';

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
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
