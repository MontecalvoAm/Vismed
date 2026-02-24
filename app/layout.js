import './globals.css';

export const metadata = {
    title: 'VisMed — Quotation System',
    description: 'VisMed Medical Hospital quotation and billing system.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
