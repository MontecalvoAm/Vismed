'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkCredentials, setSession } from '@/lib/auth';

export default function LoginForm() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate a short delay for UX feel
        await new Promise((r) => setTimeout(r, 600));

        if (checkCredentials(username, password)) {
            setSession();
            router.push('/quotation');
        } else {
            setError('Invalid username or password. Please try again.');
            setLoading(false);
        }
    };

    return (
        <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
                <label className="login-label" htmlFor="username">Username</label>
                <div className="login-input-wrap">
                    <span className="login-input-icon">👤</span>
                    <input
                        id="username"
                        type="text"
                        className="login-input"
                        placeholder="Enter username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </div>
            </div>

            <div className="login-field">
                <label className="login-label" htmlFor="password">Password</label>
                <div className="login-input-wrap">
                    <span className="login-input-icon">🔒</span>
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="login-input"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                    <button
                        type="button"
                        className="login-show-pw"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label="Toggle password visibility"
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="login-error" role="alert">
                    ⚠️ {error}
                </div>
            )}

            <button
                type="submit"
                className={`login-btn${loading ? ' login-btn-loading' : ''}`}
                disabled={loading || !username || !password}
            >
                {loading ? (
                    <span className="login-spinner" />
                ) : (
                    'Sign In →'
                )}
            </button>
        </form>
    );
}
