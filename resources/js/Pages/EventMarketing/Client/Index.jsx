import EventMarketingLayout from '@/Layouts/EventMarketingLayout';
import Pagination from '@/Components/Pagination';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { useDebounced } from '@/hooks/useDebounced';

export default function EMClientIndex({ clients, filters }) {
    const [searchTerm, setSearchTerm]     = useState(filters?.search || '');
    const [deleteClient, setDeleteClient] = useState(null);
    const [deleting, setDeleting]         = useState(false);

    const debouncedSearch = useDebounced((value) => {
        router.get(route('em.client.index'), { search: value }, {
            preserveState: true, replace: true,
        });
    });

    const handleSearch = (value) => {
        setSearchTerm(value);
        debouncedSearch(value);
    };

    const handleDelete = (client) => setDeleteClient(client);
    const confirmDeleteClient = () => {
        if (deleting) return;
        setDeleting(true);
        router.delete(route('em.client.destroy', deleteClient.id), {
            preserveScroll: true,
            onFinish: () => { setDeleteClient(null); setDeleting(false); },
        });
    };

    return (
        <EventMarketingLayout>
            <Head title="Client - Event Marketing" />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Client</h1>
                <p className="mt-1 text-gray-400">Daftar client yang terdaftar.</p>
            </div>

            {/* Filter */}
            <div className="p-5 mb-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="relative max-w-sm">
                    <input
                        type="text"
                        placeholder="Search client..."
                        value={searchTerm}
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:ring-[#FF2D55] focus:border-[#FF2D55] bg-gray-50"
                    />
                    <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                </div>
            </div>

            {/* Tabel */}
            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">List Client</h2>
                    <Link
                        href={route('em.client.create')}
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
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Nama Client</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Perusahaan</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">No Telp</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Email</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Total Event</th>
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {clients.data?.length > 0 ? clients.data.map((client, index) => (
                            <tr key={client.id} className="transition-colors hover:bg-gray-50/60">
                                <td className="px-6 py-4 text-sm font-medium text-gray-500">{(clients.from - 1) + index + 1}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-800">{client.nama_client}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.perusahaan_client || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.no_telp_client || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.email_client || '-'}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{client.events_count ?? '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={route('em.client.show', client.id)}
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
                                            href={route('em.client.edit', client.id)}
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
        </EventMarketingLayout>
    );
}
