import ManajemenLayout from '@/Layouts/ManajemenLayout';
import FinanceLayout from '@/Layouts/FinanceLayout';
import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import { Head, usePage } from '@inertiajs/react';
import { StickyNote, User, Mail, Phone, Briefcase, BadgeCheck } from 'lucide-react';

export default function Edit() {
    const { auth } = usePage().props;
    const user = auth?.user;
    const posisi = user?.posisi_pegawai;
    const note   = user?.note_pegawai;

    const Layout = posisi === 'Finance'                                  ? FinanceLayout
                 : (posisi === 'Event Marketing' || posisi === 'EventMarketing') ? EventMarketingLayout
                 : ManajemenLayout;

    const InfoRow = ({ icon, label, value }) => (
        <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-pink-50 text-[#FF2D55] flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{value || '-'}</p>
            </div>
        </div>
    );

    return (
        <Layout>
            <Head title="Profile" />

            <div className="max-w-xl mx-auto py-8 space-y-6">

                {/* Avatar + Nama */}
                <div className="flex flex-col items-center p-8 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-center w-20 h-20 mb-4 text-2xl font-black rounded-full bg-pink-50 text-[#FF2D55]">
                        {user?.nama_pegawai?.substring(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <p className="text-xl font-extrabold text-gray-900">{user?.nama_pegawai}</p>
                    <span className="mt-1 px-3 py-1 text-xs font-bold text-[#FF2D55] bg-pink-50 rounded-full">
                        {user?.posisi_pegawai}
                    </span>
                </div>

                {/* Info Detail */}
                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                    <h2 className="mb-4 text-sm font-extrabold text-gray-700">Informasi Akun</h2>
                    <InfoRow icon={<User size={15} />}      label="Nama Lengkap"  value={user?.nama_pegawai} />
                    <InfoRow icon={<Mail size={15} />}      label="Email"         value={user?.email_pegawai} />
                    <InfoRow icon={<Phone size={15} />}     label="No. HP"        value={user?.no_hp_pegawai} />
                    <InfoRow icon={<Briefcase size={15} />} label="Posisi"        value={user?.posisi_pegawai} />
                    <InfoRow icon={<BadgeCheck size={15} />} label="Jenis Pegawai" value={user?.jenis_pegawai} />
                </div>

                {/* Catatan dari Manajemen */}
                {note ? (
                    <div className="bg-white border-l-4 border-yellow-400 shadow-sm rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 bg-yellow-50 border-b border-yellow-100">
                            <StickyNote size={15} className="text-yellow-500" />
                            <p className="text-sm font-extrabold text-yellow-700">Catatan dari Manajemen</p>
                            <span className="ml-auto text-[10px] font-bold text-yellow-500 bg-yellow-100 px-2 py-0.5 rounded-full">
                                Hanya kamu yang bisa lihat
                            </span>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-5 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                        <StickyNote size={18} className="text-gray-300" />
                        <p className="text-sm text-gray-400">Belum ada catatan dari Manajemen.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
