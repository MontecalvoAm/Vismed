'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading, refreshUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showInvalidatedModal, setShowInvalidatedModal] = useState(false);

    useEffect(() => {
        if (searchParams?.get('reason') === 'session_invalidated') {
            setShowInvalidatedModal(true);
        }
    }, [searchParams]);

    const closeAlert = () => {
        setShowInvalidatedModal(false);
        router.replace('/login');
    };

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
            await loginUser(email, password, rememberMe);
            await refreshUser();
            router.push('/quotation');
        } catch (err: any) {
            setError(err?.message ?? 'Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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

                <div className="flex items-center">
                    <input
                        id="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900/50 text-accent focus:ring-accent focus:ring-offset-neutral-900"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="remember-me" className="ml-2 text-sm text-neutral-400">
                        Remember me
                    </label>
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

            {showInvalidatedModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Session Ended</h3>
                            <p className="text-sm text-neutral-400">
                                You have been logged out because this account was signed in from another device. If this was not you, please contact an Administrator to request a password change.
                            </p>
                            <button
                                type="button"
                                onClick={closeAlert}
                                className="w-full mt-4 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500"
                            >
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
