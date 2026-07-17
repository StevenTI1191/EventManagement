import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

export default function Login() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });
    const [showPass, setShowPass] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('client.login'));
    };

    return (
        <>
            <Head title="Login - Laksamana Muda" />
            <div className="flex items-center justify-center min-h-screen px-6 bg-paper">
                {/* Tombol kembali ke homepage — mengambang pojok kiri atas */}
                <Link
                    href={route('client.home')}
                    className="fixed z-50 flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-muted border rounded-full top-5 left-5 bg-surface/80 border-line backdrop-blur hover:text-gold-dim hover:border-gold-2 transition-all"
                >
                    <ArrowLeft size={16} />
                    Kembali
                </Link>
                <div className="w-full max-w-md">

                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <a href={route('client.home')} className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 overflow-hidden border-2 rounded-full bg-surface border-gold hover:scale-105 transition-transform">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-12 h-12" />
                        </a>
                        <h1 className="text-2xl font-black text-ink">
                            Laksamana <span className="text-gold">Muda</span>
                        </h1>
                        <p className="mt-1 text-sm text-muted">Masuk ke akun Anda</p>
                    </div>

                    <div className="p-8 border bg-surface border-line rounded-2xl">

                        {/* Google Login */}
                        <a href={route('client.google.redirect')}
                            className="flex items-center justify-center w-full gap-3 px-4 py-3 mb-5 font-bold text-sm text-ink bg-surface border border-line rounded-xl hover:bg-gold-soft hover:border-gold-2 transition-all">
                            <GoogleIcon />
                            Masuk dengan Google
                        </a>

                        {/* Flash: password berhasil direset */}
                        {flash?.success && (
                            <div className="flex items-center gap-3 p-3 mb-5 bg-ok-bg border border-ok/30 rounded-xl">
                                <CheckCircle size={16} className="text-ok flex-shrink-0" />
                                <p className="text-sm font-bold text-ok">{flash.success}</p>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-px bg-line" />
                            <span className="text-xs text-muted-2 font-medium">atau dengan email</span>
                            <div className="flex-1 h-px bg-line" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Email</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full px-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line rounded-xl focus:border-gold focus:outline-none transition-colors"
                                />
                                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 pr-11 text-sm text-ink placeholder-muted-2 bg-surface border border-line rounded-xl focus:border-gold focus:outline-none transition-colors"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-3 text-muted-2 hover:text-gold-dim transition-colors">
                                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
                                <div className="mt-1.5 text-right">
                                    <Link href={route('client.forgot-password')}
                                        className="text-xs text-muted hover:text-gold-dim transition-colors">
                                        Lupa password?
                                    </Link>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <div className="relative flex-shrink-0">
                                    <input type="checkbox" checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked)}
                                        className="sr-only peer" />
                                    <div className="w-4 h-4 rounded border border-line bg-surface peer-checked:bg-gold peer-checked:border-gold transition-all" />
                                    {data.remember && (
                                        <svg className="absolute inset-0 w-4 h-4 text-white pointer-events-none" viewBox="0 0 16 16" fill="none">
                                            <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs text-muted">Ingat saya selama 30 hari</span>
                            </label>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3 font-black text-white transition-all bg-gold rounded-xl hover:bg-gold-2 disabled:opacity-60"
                            >
                                {processing ? 'Masuk...' : 'Masuk'}
                            </button>
                        </form>

                        <p className="mt-6 text-sm text-center text-muted">
                            Belum punya akun?{' '}
                            <Link href={route('client.register')} className="font-bold text-gold-dim hover:text-gold">
                                Daftar sekarang
                            </Link>
                        </p>

                        <div className="mt-3 text-center">
                            <Link href={route('client.home')} className="text-xs text-muted-2 hover:text-muted transition-colors">
                                ← Kembali ke Homepage
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
