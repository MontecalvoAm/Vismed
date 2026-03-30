/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable gzip/brotli compression for all responses — reduces transfer size by 20-30%
    compress: true,

    // Suppress warning about quality 100 not being documented
    images: {
        qualities: [25, 50, 75, 100],
    },

    experimental: {
        // Tree-shake lucide-react so only used icons are bundled
        optimizePackageImports: ['lucide-react'],
    },

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // Prevent clickjacking attacks
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // Prevent MIME type sniffing
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Control referrer information
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Disable unnecessary browser features
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    // Content Security Policy
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com wss://firebase-mtls.sandbox.googleapis.com;"
                    },
                    // XSS Protection (legacy but still useful for older browsers)
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
