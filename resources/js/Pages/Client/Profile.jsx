import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, User, Mail, Phone, Building2, Lock, Save, Eye, EyeOff, CheckCircle, Shield, LayoutDashboard } from 'lucide-react';

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

export default function ClientProfile({ auth, has_password }) {
    const { flash } = usePage().props;
    const user = auth?.user;

    const [showCurrent, setShowCurrent]   = useState(false);
    const [showPass, setShowPass]         = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);

    const { data, setData, patch, processing, errors, reset } = useForm({
        nama_client:           user?.nama_client       || '',
        email_client:          user?.email_client      || '',
        no_telp_client:        user?.no_telp_client    || '',
        perusahaan_client:     user?.perusahaan_client || '',
        current_password:      '',
        password:              '',
        password_confirmation: '',
    });

    const isChangingPassword = data.password.length > 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('client.profile.update'), {
            onSuccess: () => reset('current_password', 'password', 'password_confirmation'),
        });
    };

    const inputClass = "w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-yellow-500 focus:outline-none placeholder-gray-600 transition-colors";
    const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2";

    return (
        <>
            <Head title="Profil Saya - Laksamana Muda" />
            <div className="min-h-screen bg-black">

                {/* Navbar */}
                <nav className="sticky top-0 z-40 px-6 py-3 bg-gray-900/95 backdrop-blur-md border-b border-yellow-500/20">
                    <div className="flex items-center justify-between max-w-3xl mx-auto">

                        {/* Left: Brand */}
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 overflow-hidden bg-black border border-yellow-500 rounded-full">
                                <img src="/images/LaksamanaLogo.png" alt="Logo" className="object-contain w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white leading-none">
                                    Laksamana <span className="text-yellow-500">Muda</span>
                                </span>
                                <p className="text-[10px] text-gray-600 leading-none mt-0.5">Profil Saya</p>
                            </div>
                        </div>

                        {/* Right: Back to Dashboard */}
                        <Link href={route('client.dashboard')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-800 border border-gray-700 rounded-xl hover:text-yellow-400 hover:border-yellow-500/40 hover:bg-yellow-500/10 transition-all">
                            <LayoutDashboard size={13} />
                            Dashboard
                        </Link>

                    </div>
                </nav>

                <div className="max-w-3xl px-6 py-10 mx-auto">

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl font-black text-black bg-yellow-500 rounded-full flex-shrink-0">
                            {user?.nama_client?.substring(0, 2).toUpperCase() ?? '??'}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-black text-white truncate sm:text-2xl">{user?.nama_client}</h1>
                            <p className="text-sm text-gray-400 truncate">{user?.email_client}</p>
                            {user?.perusahaan_client && (
                                <p className="text-xs text-yellow-500/70 mt-0.5 truncate">🏢 {user.perusahaan_client}</p>
                            )}
                            {/* Google-linked badge */}
                            {user?.has_google && (
                                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                                    <svg width="10" height="10" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                    Terhubung dengan Google
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Flash */}
                    {flash?.success && (
                        <div className="flex items-center gap-3 p-4 mb-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                            <p className="text-sm font-bold text-green-400">{flash.success}</p>
                        </div>
                    )}
                    {flash?.warning && (
                        <div className="flex items-center gap-3 p-4 mb-6 border bg-yellow-500/10 border-yellow-500/30 rounded-xl">
                            <span className="text-lg flex-shrink-0">📋</span>
                            <p className="text-sm font-bold text-yellow-400">{flash.warning}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Info Pribadi */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-5 text-sm font-extrabold text-white">
                                <User size={16} className="text-yellow-500" />
                                Informasi Pribadi
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Nama Lengkap *</label>
                                    <input type="text" value={data.nama_client}
                                        onChange={e => setData('nama_client', e.target.value)}
                                        placeholder="Nama lengkap" className={inputClass} />
                                    {errors.nama_client && <p className="mt-1 text-xs text-red-400">{errors.nama_client}</p>}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass}>Email *</label>
                                        <div className="relative">
                                            <Mail size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                            <input type="email" value={data.email_client}
                                                onChange={e => setData('email_client', e.target.value)}
                                                placeholder="email@example.com"
                                                className={inputClass + ' pl-9'} />
                                        </div>
                                        {errors.email_client && <p className="mt-1 text-xs text-red-400">{errors.email_client}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>No. HP *</label>
                                        <div className="relative">
                                            <Phone size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                            <input type="tel" value={data.no_telp_client}
                                                onChange={e => setData('no_telp_client', e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                                                placeholder="08123456789"
                                                className={inputClass + ' pl-9'} />
                                        </div>
                                        {errors.no_telp_client && <p className="mt-1 text-xs text-red-400">{errors.no_telp_client}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Perusahaan *</label>
                                    <div className="relative">
                                        <Building2 size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                        <input type="text" value={data.perusahaan_client}
                                            onChange={e => setData('perusahaan_client', e.target.value)}
                                            placeholder="PT. Nama Perusahaan"
                                            className={inputClass + ' pl-9'} />
                                    </div>
                                    {errors.perusahaan_client && <p className="mt-1 text-xs text-red-400">{errors.perusahaan_client}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Ganti Password */}
                        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
                            <h2 className="flex items-center gap-2 mb-1 text-sm font-extrabold text-white">
                                <Shield size={16} className="text-yellow-500" />
                                {has_password ? 'Ganti Password' : 'Buat Password'}
                            </h2>
                            <p className="mb-5 text-xs text-gray-500">
                                {has_password
                                    ? 'Kosongkan jika tidak ingin mengubah password.'
                                    : 'Akun Anda menggunakan Google. Isi untuk menambahkan password login manual.'}
                            </p>

                            <div className="space-y-4">
                                {/* Current password — hanya muncul jika akun sudah punya password DAN sedang mengisi password baru */}
                                {has_password && (
                                    <div className={`transition-all duration-200 ${isChangingPassword ? 'opacity-100' : 'opacity-50'}`}>
                                        <label className={labelClass}>
                                            Password Saat Ini {isChangingPassword && <span className="text-red-400">*</span>}
                                        </label>
                                        <div className="relative">
                                            <Lock size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                            <input
                                                type={showCurrent ? 'text' : 'password'}
                                                value={data.current_password}
                                                onChange={e => setData('current_password', e.target.value)}
                                                placeholder="Password yang sekarang dipakai"
                                                className={inputClass + ' pl-9 pr-10'}
                                            />
                                            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors">
                                                {showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                        {errors.current_password && (
                                            <p className="mt-1 text-xs text-red-400">⚠ {errors.current_password}</p>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className={labelClass}>Password Baru</label>
                                        <div className="relative">
                                            <Lock size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                            <input type={showPass ? 'text' : 'password'}
                                                value={data.password}
                                                onChange={e => setData('password', e.target.value)}
                                                placeholder="Minimal 6 karakter"
                                                className={inputClass + ' pl-9 pr-10'} />
                                            <button type="button" onClick={() => setShowPass(!showPass)}
                                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors">
                                                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                        {/* Strength bar — hanya tampil saat mengetik password baru */}
                                        <PasswordStrengthBar password={data.password} />
                                        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Konfirmasi Password</label>
                                        <div className="relative">
                                            <Lock size={15} className="absolute text-gray-600 left-3 top-3.5" />
                                            <input type={showConfirm ? 'text' : 'password'}
                                                value={data.password_confirmation}
                                                onChange={e => setData('password_confirmation', e.target.value)}
                                                placeholder="Ulangi password baru"
                                                className={inputClass + ' pl-9 pr-10'} />
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
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <Link href={route('client.dashboard')}
                                className="flex-1 py-3 text-sm font-bold text-center text-gray-400 transition-colors border border-gray-700 rounded-xl hover:bg-gray-800">
                                Batal
                            </Link>
                            <button type="submit" disabled={processing}
                                className="flex flex-1 items-center justify-center gap-2 py-3 font-black text-black transition-all bg-yellow-500 rounded-xl hover:bg-yellow-400 disabled:opacity-60">
                                <Save size={16} />
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
