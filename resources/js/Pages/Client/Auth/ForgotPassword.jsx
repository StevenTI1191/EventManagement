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
            <div className="flex items-center justify-center min-h-screen px-6 bg-black">
                <div className="w-full max-w-md">

                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <a href={route('client.home')} className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 overflow-hidden bg-black border-2 border-yellow-500 rounded-full hover:scale-105 transition-transform">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-12 h-12" />
                        </a>
                        <h1 className="text-2xl font-black text-white">
                            Laksamana <span className="text-yellow-500">Muda</span>
                        </h1>
                        <p className="mt-1 text-sm text-gray-400">Reset password akun Anda</p>
                    </div>

                    <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">

                        {/* Success state */}
                        {flash?.success ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-500/10 border border-green-500/30 rounded-full">
                                    <CheckCircle size={28} className="text-green-400" />
                                </div>
                                <h2 className="text-base font-extrabold text-white mb-2">Email Terkirim!</h2>
                                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                    {flash.success}
                                </p>
                                <p className="text-xs text-gray-600">
                                    Tidak menerima email?{' '}
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors">
                                        Kirim ulang
                                    </button>
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                    Masukkan email yang terdaftar. Kami akan mengirimkan link untuk membuat password baru.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                            <input
                                                type="email"
                                                value={data.email}
                                                onChange={e => setData('email', e.target.value)}
                                                placeholder="email@example.com"
                                                autoFocus
                                                className="w-full pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 bg-black border border-gray-700 rounded-xl focus:border-yellow-500 focus:outline-none transition-colors"
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="mt-1 text-xs text-red-400">⚠ {errors.email}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing || !data.email}
                                        className="w-full py-3 font-black text-black transition-all bg-yellow-500 rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {processing ? 'Mengirim...' : 'Kirim Link Reset'}
                                    </button>
                                </form>
                            </>
                        )}

                        <div className="mt-6 text-center">
                            <Link href={route('client.login')}
                                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                                <ArrowLeft size={12} /> Kembali ke halaman masuk
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
