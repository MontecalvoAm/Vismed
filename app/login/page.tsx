import LoginForm from '@/components/login/LoginForm';
import Image from 'next/image';

export const metadata = {
    title: 'Login — VisMed Quotation System',
    description: 'Sign in to access the VisMed quotation and billing system.',
};

export default function LoginPage() {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-900">
            {/* Background Image Overlay */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/Background.png"
                    alt="VisayasMed Background"
                    fill
                    className="object-cover opacity-30 mix-blend-overlay"
                    quality={100}
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/60 to-neutral-950/90" />
            </div>

            <div className="relative z-10 w-full max-w-md p-8 md:p-10 bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl shadow-2xl flex flex-col items-center">
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center justify-center">
                    <Image
                        src="/VisayasMedical.png"
                        alt="VisayasMed Logo"
                        width={100}
                        height={100}
                        className="object-contain drop-shadow-lg"
                        priority
                    />
                </div>

                <div className="text-center w-full mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Quotation Portal</h1>
                    <p className="text-sm text-neutral-400 font-medium">Sign in to access the billing system</p>
                </div>

                <div className="w-full">
                    <LoginForm />
                </div>

                <div className="mt-10 text-xs text-neutral-500 font-medium tracking-wide">
                    © 2026 VisayasMed Hospital&nbsp;·&nbsp;Billing & Records
                </div>
            </div>
        </div>
    );
}
