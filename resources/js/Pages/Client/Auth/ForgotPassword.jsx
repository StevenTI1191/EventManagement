import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('client.forgot-password.send'));
    };

    return (
        <>
            <Head title="Lupa Password - Laksamana Muda" />
            <div className="flex items-center justify-center min-h-screen px-6 bg-surface">
                <div className="w-full max-w-md">

                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <a href={route('client.home')} className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 overflow-hidden bg-surface border-2 border-gold rounded-full hover:scale-105 transition-transform">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-12 h-12" />
                        </a>
                        <h1 className="text-2xl font-black text-ink">
                            Laksamana <span className="text-gold">Muda</span>
                        </h1>
                        <p className="mt-1 text-sm text-muted">Reset password akun Anda</p>
                    </div>

                    <div className="p-8 bg-surface border border-line rounded-2xl">

                        {/* Success state */}
                        {flash?.success ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-ok-bg border border-ok/30 rounded-full">
                                    <CheckCircle size={28} className="text-ok" />
                                </div>
                                <h2 className="text-base font-extrabold text-ink mb-2">Email Terkirim!</h2>
                                <p className="text-sm text-muted leading-relaxed mb-6">
                                    {flash.success}
                                </p>
                                <p className="text-xs text-muted-2">
                                    Tidak menerima email?{' '}
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-gold-dim font-bold hover:text-gold transition-colors">
                                        Kirim ulang
                                    </button>
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-muted mb-6 leading-relaxed">
                                    Masukkan email yang terdaftar. Kami akan mengirimkan link untuk membuat password baru.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block mb-2 text-xs font-bold tracking-wider text-muted uppercase">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail size={15} className="absolute text-muted-2 left-3 top-3.5" />
                                            <input
                                                type="email"
                                                value={data.email}
                                                onChange={e => setData('email', e.target.value)}
                                                placeholder="email@example.com"
                                                autoFocus
                                                className="w-full pl-9 pr-4 py-3 text-sm text-ink placeholder-muted-2 bg-surface border border-line rounded-xl focus:border-gold focus:outline-none transition-colors"
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="mt-1 text-xs text-danger">⚠ {errors.email}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing || !data.email}
                                        className="w-full py-3 font-black text-white transition-all bg-gold rounded-xl hover:bg-gold-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {processing ? 'Mengirim...' : 'Kirim Link Reset'}
                                    </button>
                                </form>
                            </>
                        )}

                        <div className="mt-6 text-center">
                            <Link href={route('client.login')}
                                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold-dim transition-colors">
                                <ArrowLeft size={12} /> Kembali ke halaman masuk
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
