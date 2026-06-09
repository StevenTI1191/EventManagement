import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta }) {
    if (!meta || meta.last_page <= 1) return null;

    const { current_page, last_page, from, to, total, links } = meta;

    return (
        <div className="flex flex-col items-center gap-3 mt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-gray-400">
                Menampilkan <span className="font-semibold text-gray-600">{from}–{to}</span> dari{' '}
                <span className="font-semibold text-gray-600">{total}</span> data
            </p>

            <div className="flex items-center gap-1">
                {/* Prev */}
                {links[0]?.url ? (
                    <Link href={links[0].url}
                        className="flex items-center justify-center w-8 h-8 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
                        <ChevronLeft size={15} />
                    </Link>
                ) : (
                    <span className="flex items-center justify-center w-8 h-8 text-gray-300 bg-gray-50 border border-gray-100 rounded-lg cursor-not-allowed">
                        <ChevronLeft size={15} />
                    </span>
                )}

                {/* Page numbers */}
                {links.slice(1, -1).map((link, i) => {
                    if (link.label === '...') {
                        return (
                            <span key={i} className="flex items-center justify-center w-8 h-8 text-xs text-gray-400">
                                ...
                            </span>
                        );
                    }
                    return link.url ? (
                        <Link key={i} href={link.url}
                            className={`flex items-center justify-center w-8 h-8 text-xs font-semibold rounded-lg border transition-colors ${
                                link.active
                                    ? 'bg-[#FF2D55] text-white border-[#FF2D55] shadow-sm shadow-[#FF2D55]/30'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}>
                            {link.label}
                        </Link>
                    ) : (
                        <span key={i}
                            className="flex items-center justify-center w-8 h-8 text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-lg">
                            {link.label}
                        </span>
                    );
                })}

                {/* Next */}
                {links[links.length - 1]?.url ? (
                    <Link href={links[links.length - 1].url}
                        className="flex items-center justify-center w-8 h-8 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors">
                        <ChevronRight size={15} />
                    </Link>
                ) : (
                    <span className="flex items-center justify-center w-8 h-8 text-gray-300 bg-gray-50 border border-gray-100 rounded-lg cursor-not-allowed">
                        <ChevronRight size={15} />
                    </span>
                )}
            </div>
        </div>
    );
}
