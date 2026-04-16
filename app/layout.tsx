import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { LoadingProvider } from '@/context/LoadingContext';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { getServerUser } from '@/lib/getServerUser';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'VisayasMed Hospital | Quotation System',
    description: 'Internal quotation and billing system for VisayasMed Hospital.',
    icons: {
        icon: '/VisayasMedical.png',
        apple: '/VisayasMedical.png'
    }
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Attempt to fetch the user session directly on the server
    const initialUser = await getServerUser();

    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://identitytoolkit.googleapis.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
                <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
            </head>
            <body className={`${inter.variable} font-sans`}>
                <LoadingProvider>
                    <ConfirmProvider>
                        <AuthProvider initialUser={initialUser}>
                            {children}
                            <LoadingOverlay />
                        </AuthProvider>
                    </ConfirmProvider>
                </LoadingProvider>
            </body>
        </html>
    );
}
