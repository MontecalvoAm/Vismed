import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ConfirmProvider } from '@/context/ConfirmContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'VisayasMed Hospital | Quotation System',
    description: 'Internal quotation and billing system for VisayasMed Hospital.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans`}>
                <ConfirmProvider>
                    <AuthProvider>{children}</AuthProvider>
                </ConfirmProvider>
            </body>
        </html>
    );
}
