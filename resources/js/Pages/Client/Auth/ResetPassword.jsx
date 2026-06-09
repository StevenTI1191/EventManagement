import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';

const getPasswordStrength = (password) => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 6)           score++;
    if (password.length >= 10)          score++;
    if (/[A-Z]/.test(password))         score++;
    if (/[0-9]/.test(password))         score++;
    if (/[^A-Za-z0-9]/.test(password))  score++;
    if (score <= 1) return { label: 'Lemah',  bars: 1, bar: 'bg-red-500',    text: 'text-red-400'    };
    if (score <= 3) return { label: 'Sedang', bars: 2, bar: 'bg-yellow-500', text: 'text-yellow-400' };
    return             { label: 'Kuat',   bars: 3, bar: 'bg-green-500',  text: 'text-green-400'  };
};

const PasswordStrengthBar = ({ password }) => {
    const s = getPasswordStrength(password);
    if (!s) return null;
    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-1 flex-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= s.bars ? s.bar : 'bg-gray-700'}`} />
                ))}
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${s.text}`}>{s.label}</span>
        </div>
    );
};

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password:              '',
        password_confirmation: '',
    });
    const [showPass, setShowPass]       = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('client.reset-password.update'));
    };

    const inputBase = "w-full pl-9 pr-11 py-3 text-sm text-white placeholder-gray-600 bg-black border border-gray-700 rounded-xl focus:border-yellow-500 focus:outline-none transition-colors";

    return (
        <>
            <Head title="Buat Password Baru - Laksamana Muda" />
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
                        <p className="mt-1 text-sm text-gray-400">Buat password baru</p>
                    </div>

                    <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">

                        {/* Token error */}
                        {errors.token && (
                            <div className="flex items-start gap-3 p-4 mb-5 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <span className="text-red-400 mt-0.5">⚠</span>
                                <div>
                                    <p className="text-sm font-bold text-red-400">{errors.token}</p>
                                    <Link href={route('client.forgot-password')}
                                        className="text-xs text-yellow-400 hover:text-yellow-300 mt-1 inline-block transition-colors">
                                        Minta link baru →
                                    </Link>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email readonly */}
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={data.email}
                                    readOnly
                                    className="w-full px-4 py-3 text-sm text-gray-500 bg-gray-800 border border-gray-700 rounded-xl cursor-not-allowed"
                                />
                            </div>

                            {/* Password baru */}
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                    Password Baru
                                </label>
                                <div className="relative">
                                    <Lock size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        autoFocus
                                        className={inputBase}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                <PasswordStrengthBar password={data.password} />
                                {errors.password && <p className="mt-1 text-xs text-red-400">⚠ {errors.password}</p>}
                            </div>

                            {/* Konfirmasi */}
                            <div>
                                <label className="block mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                    Konfirmasi Password
                                </label>
                                <div className="relative">
                                    <Lock size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        placeholder="Ulangi password baru"
                                        className={inputBase}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                {data.password_confirmation && data.password && (
                                    <p className={`mt-1.5 text-[10px] font-bold ${
                                        data.password === data.password_confirmation ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {data.password === data.password_confirmation ? '✓ Password cocok' : '✗ Password tidak cocok'}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !data.password || !data.password_confirmation}
                                className="w-full py-3 font-black text-black transition-all bg-yellow-500 rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                {processing ? 'Menyimpan...' : 'Simpan Password Baru'}
                            </button>
                        </form>

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
