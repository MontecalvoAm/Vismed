import LoginForm from '@/components/login/LoginForm';

export const metadata = {
    title: 'Login — VisMed Quotation System',
    description: 'Sign in to access the VisMed quotation and billing system.',
};

export default function LoginPage() {
    return (
        <div className="login-page">
            <div className="login-bg-overlay" />

            <div className="login-card">
                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-icon">✚</div>
                    <div>
                        <span className="login-logo-vis">Vis</span>
                        <span className="login-logo-med">Med</span>
                    </div>
                </div>

                <div className="login-header">
                    <h1 className="login-title">Quotation Portal</h1>
                    <p className="login-subtitle">Sign in to access the billing system</p>
                </div>

                <LoginForm />

                <div className="login-footer-note">
                    © 2026 VisMed Medical Hospital&nbsp;·&nbsp;Billing & Records
                </div>
            </div>
        </div>
    );
}
