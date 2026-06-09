import FinanceLayout from '@/Layouts/FinanceLayout';
import Pagination from '@/Components/Pagination';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounced } from '@/hooks/useDebounced';

export default function FinanceClientIndex({ auth, clients, filters }) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');

    const debouncedSearch = useDebounced((value) => {
        router.get(route('finance.client.index'), { search: value }, {
            preserveState: true, replace: true,
        });
    });

    const handleSearch = (value) => {
        setSearchTerm(value);
        debouncedSearch(value);
    };

    return (
        <FinanceLayout>
            <Head title="Client - Finance" />

            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Client</h1>
                <p className="mt-1 font-medium text-gray-500">Selamat Datang, {auth.user.nama_pegawai}!</p>
            </div>

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

            <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-extrabold text-gray-800">List Client</h2>
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
                            <th className="px-6 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">Detail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {clients.data && clients.data.length > 0 ? clients.data.map((client, index) => (
                            <tr key={client.id} className="transition-colors hover:bg-gray-50/60">
                                <td className="px-6 py-4 text-sm font-medium text-gray-500">{(clients.from - 1) + index + 1}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-800">{client.nama_client}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.perusahaan_client || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.no_telp_client || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{client.email_client || '-'}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{client.events_count ?? '-'}</td>
                                <td className="px-6 py-4">
                                    <Link
                                        href={route('finance.client.show', client.id)}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF2D55] text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors w-fit"
                                    >
                                        Detail
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 12h14M12 5l7 7-7 7"/>
                                        </svg>
                                    </Link>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                    <p className="font-bold">Belum ada data client.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <Pagination meta={clients} />
            </div>
        </FinanceLayout>
    );
}

