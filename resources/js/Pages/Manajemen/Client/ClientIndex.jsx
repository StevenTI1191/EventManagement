import ManajemenLayout from '@/Layouts/ManajemenLayout';
import Pagination from '@/Components/Pagination';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounced } from '@/hooks/useDebounced';

export default function ClientIndex({ auth, clients, filters }) {
    const { flash } = usePage().props;
    const [searchTerm, setSearchTerm]     = useState(filters?.search || '');
    const [deleteClient, setDeleteClient] = useState(null);
    const [deleting, setDeleting]         = useState(false);

    const debouncedSearch = useDebounced((value) => {
        router.get(route('manajemen.client.index'), { search: value }, {
            preserveState: true, replace: true,
        });
    });

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        debouncedSearch(value);
    };

    const handleDelete = (client) => setDeleteClient(client);
    const confirmDeleteClient = () => {
        if (deleting) return;
        setDeleting(true);
        router.delete(route('manajemen.client.destroy', deleteClient.id), {
            preserveScroll: true,
            onFinish: () => { setDeleteClient(null); setDeleting(false); },
        });
    };

    return (
        <ManajemenLayout>
            <Head title="Client - Laksamana Muda" />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Client</h1>
                <p className="mt-1 font-medium text-gray-400">Selamat Datang, {auth.user.nama_pegawai}!</p>
            </div>

            {flash?.success && (
                <div className="p-4 mb-6 text-sm font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">
                    ✅ {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="p-4 mb-6 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                    ⚠️ {flash.error}
                </div>
            )}

            {/* Filter */}
            <div className="p-5 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">Filter</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50">
                        <button className="text-gray-400 hover:text-gray-600"><ChevronLeft size={14} /></button>
                        <span className="px-2 text-sm font-medium text-gray-600">All Time</span>
                        <button className="text-gray-400 hover:text-gray-600"><ChevronRight size={14} /></button>
                        <button className="ml-1 text-gray-400 hover:text-[#FF2D55]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </button>
                    </div>
                    <div className="relative flex-1 max-w-sm">
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={e => handleSearchChange(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55] bg-gray-50"
                        />
                        <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Tabel */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">List Client</h2>
                    <Link
                        href={route('manajemen.client.create')}
                        className="flex items-center gap-2 px-5 py-2 bg-[#FF2D55] text-white text-sm font-bold rounded-xl hover:bg-[#e02249] transition-colors shadow-md shadow-[#FF2D55]/20"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add Client
                    </Link>
                </div>

                <table className="w-full">
                    <thead>
                        <tr className="bg-[#FF2D55]">
                            <th className="w-12 px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">No</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Perusahaan</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">PIC Client</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">No Telp</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Email</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Total Event</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {clients.data && clients.data.length > 0 ? clients.data.map((client, index) => (
                            <tr key={client.id} className="transition-colors hover:bg-gray-50/60">
                                <td className="px-6 py-4 text-sm font-medium text-gray-500">{(clients.from - 1) + index + 1}</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 text-sm font-extrabold text-[#FF2D55] bg-pink-50 rounded-xl">
                                        {client.perusahaan_client || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-800">{client.nama_client}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.no_telp_client || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.email_client || '-'}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{client.events_count ?? 0}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={route('manajemen.client.show', client.id)}
                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-400 text-white text-xs font-bold rounded-lg hover:bg-orange-500 transition-colors"
                                        >
                                            Detail
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(client)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <Link
                                            href={route('manajemen.client.edit', client.id)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Pencil size={14} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada data client.</p>
                                    <p className="mt-1 text-sm">Klik "Add Client" untuk menambahkan.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <Pagination meta={clients} />
            </div>

            {deleteClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white shadow-xl rounded-2xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-red-50">
                            <Trash2 size={20} className="text-red-500" />
                        </div>
                        <h2 className="mb-1 text-base font-extrabold text-center text-gray-900">Hapus Client?</h2>
                        <p className="mb-1 text-sm font-bold text-center text-gray-700">"{deleteClient.nama_client}"</p>
                        <p className="mb-5 text-xs text-center text-gray-400">Tindakan ini tidak bisa dibatalkan.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteClient(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={confirmDeleteClient} disabled={deleting}
                                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-60">
                                {deleting ? 'Menghapus...' : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ManajemenLayout>
    );
}

