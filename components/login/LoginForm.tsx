'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithFirebase } from '@/lib/auth';
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginForm() {
    const router = useRouter();
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.push('/quotation');
        }
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await loginWithFirebase(email, password);
            await refreshUser();
            router.push('/quotation');
        } catch (err: any) {
            // Map Firebase error codes to user-friendly messages
            const code = err?.code ?? '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please try again.');
            } else if (code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else if (code === 'auth/user-disabled') {
                setError('This account has been disabled. Contact your administrator.');
            } else {
                setError(err?.message ?? 'An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="w-full flex flex-col space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300 ml-1" htmlFor="email">Email</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-accent transition-colors">
                        <User className="h-5 w-5" />
                    </div>
                    <input
                        id="email"
                        type="email"
                        className="w-full pl-11 pr-4 py-3 bg-neutral-900/50 border border-neutral-700/50 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300 ml-1" htmlFor="password">Password</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-accent transition-colors">
                        <Lock className="h-5 w-5" />
                    </div>
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-11 pr-12 py-3 bg-neutral-900/50 border border-neutral-700/50 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-white transition-colors focus:outline-none"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label="Toggle password visibility"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-lg" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                className="w-full group mt-2 relative flex items-center justify-center py-3 px-6 bg-primary text-primary-foreground font-semibold rounded-xl overflow-hidden transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                disabled={loading || !email || !password}
            >
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <span className="flex items-center tracking-wide">
                        Sign In
                        <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                )}
            </button>
        </form>
    );
}
