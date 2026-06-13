import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

// Password strength scorer
const getPasswordStrength = (password) => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 6)           score++;
    if (password.length >= 10)          score++;
    if (/[A-Z]/.test(password))         score++;
    if (/[0-9]/.test(password))         score++;
    if (/[^A-Za-z0-9]/.test(password))  score++;
    if (score <= 1) return { label: 'Lemah',  bars: 1, bar: 'bg-red-500',   text: 'text-red-400'   };
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

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        nama_client:           '',
        perusahaan_client:     '',
        email_client:          '',
        no_telp_client:        '',
        password:              '',
        password_confirmation: '',
    });
    const [showPass, setShowPass]       = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('client.register'));
    };

    const inputClass = "w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-yellow-500 focus:outline-none placeholder-gray-600 transition-colors";
    const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2";

    return (
        <>
            <Head title="Daftar - Laksamana Muda" />
            <div className="flex items-center justify-center min-h-screen px-6 py-12 bg-black">
                {/* Tombol kembali ke homepage — mengambang pojok kiri atas */}
                <Link
                    href={route('client.home')}
                    className="fixed z-50 flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-gray-300 border rounded-full top-5 left-5 bg-gray-900/80 border-gray-700 backdrop-blur hover:text-yellow-400 hover:border-yellow-500/50 transition-all"
                >
                    <ArrowLeft size={16} />
                    Kembali
                </Link>
                <div className="w-full max-w-md">

                    {/* Logo */}
                    <div className="mb-8 text-center">
                        <a href={route('client.home')} className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 overflow-hidden bg-black border-2 border-yellow-500 rounded-full hover:scale-105 transition-transform">
                            <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-12 h-12" />
                        </a>
                        <h1 className="text-2xl font-black text-white">
                            Laksamana <span className="text-yellow-500">Muda</span>
                        </h1>
                        <p className="mt-1 text-sm text-gray-400">Buat akun baru</p>
                    </div>

                    <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">

                        {/* Google Register */}
                        <a href={route('client.google.redirect')}
                            className="flex items-center justify-center w-full gap-3 px-4 py-3 mb-5 font-bold text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 hover:border-gray-600 transition-all">
                            <GoogleIcon />
                            Daftar dengan Google
                        </a>

                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-px bg-gray-800" />
                            <span className="text-xs text-gray-600 font-medium">atau isi form di bawah</span>
                            <div className="flex-1 h-px bg-gray-800" />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={labelClass}>Nama Lengkap *</label>
                                <input type="text" value={data.nama_client}
                                    onChange={e => setData('nama_client', e.target.value)}
                                    placeholder="John Doe" className={inputClass} />
                                {errors.nama_client && <p className="mt-1 text-xs text-red-400">{errors.nama_client}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Perusahaan *</label>
                                <input type="text" value={data.perusahaan_client}
                                    onChange={e => setData('perusahaan_client', e.target.value)}
                                    placeholder="PT. Example" className={inputClass} />
                                {errors.perusahaan_client && <p className="mt-1 text-xs text-red-400">{errors.perusahaan_client}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Email *</label>
                                <input type="email" value={data.email_client}
                                    onChange={e => setData('email_client', e.target.value)}
                                    placeholder="email@example.com" className={inputClass} />
                                {errors.email_client && <p className="mt-1 text-xs text-red-400">{errors.email_client}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>No HP *</label>
                                <input type="tel" value={data.no_telp_client}
                                    onChange={e => setData('no_telp_client', e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                                    placeholder="08123456789" className={inputClass} />
                                {errors.no_telp_client && <p className="mt-1 text-xs text-red-400">{errors.no_telp_client}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Password *</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        className={inputClass + ' pr-11'} />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                {/* Strength bar */}
                                <PasswordStrengthBar password={data.password} />
                                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Konfirmasi Password *</label>
                                <div className="relative">
                                    <input type={showConfirm ? 'text' : 'password'} value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        placeholder="Ulangi password"
                                        className={inputClass + ' pr-11'} />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors">
                                        {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                {/* Match indicator */}
                                {data.password_confirmation && data.password && (
                                    <p className={`mt-1.5 text-[10px] font-bold ${
                                        data.password === data.password_confirmation
                                            ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {data.password === data.password_confirmation
                                            ? '✓ Password cocok'
                                            : '✗ Password tidak cocok'}
                                    </p>
                                )}
                            </div>

                            <button type="submit" disabled={processing}
                                className="w-full py-3 font-black text-black transition-all bg-yellow-500 rounded-xl hover:bg-yellow-400 disabled:opacity-60 mt-2">
                                {processing ? 'Mendaftar...' : 'Daftar Sekarang'}
                            </button>
                        </form>

                        <p className="mt-6 text-sm text-center text-gray-500">
                            Sudah punya akun?{' '}
                            <Link href={route('client.login')} className="font-bold text-yellow-400 hover:text-yellow-300">
                                Masuk di sini
                            </Link>
                        </p>

                        <div className="mt-3 text-center">
                            <Link href={route('client.home')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                                ← Kembali ke Homepage
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
