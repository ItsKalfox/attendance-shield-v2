import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ 
    currentPage = 1, 
    totalItems = 0, 
    pageSize = 10, 
    onPageChange,
    align = 'center' // 'center' | 'right'
}) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (totalItems === 0) return null;

    // Generate page numbers with smart ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const delta = 1; // pages around current page

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }
        return pages;
    };

    const alignmentClass = align === 'right' ? 'justify-end' : 'justify-center';

    return (
        <div className={`px-5 py-3.5 border-t border-slate-100 flex items-center ${alignmentClass} bg-slate-50/50 select-none`}>
            {/* Pagination Controls with Arrows & Page Numbers */}
            <div className="flex items-center space-x-1.5">
                {/* First Page (Only show if totalPages > 2) */}
                {totalPages > 2 && (
                    <button
                        type="button"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:cursor-not-allowed transition shadow-sm"
                        title="First Page"
                    >
                        <ChevronsLeft size={14} />
                    </button>
                )}

                {/* Previous Page Arrow */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:cursor-not-allowed transition shadow-sm"
                    title="Previous Page"
                >
                    <ChevronLeft size={14} />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1 px-0.5">
                    {getPageNumbers().map((page, idx) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400 font-bold">
                                    ...
                                </span>
                            );
                        }
                        const isCurrent = page === currentPage;
                        return (
                            <button
                                key={`page-${page}`}
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-xl transition shadow-sm ${
                                    isCurrent
                                        ? 'bg-brand-600 text-white shadow-brand-500/25 cursor-default'
                                        : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next Page Arrow */}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:cursor-not-allowed transition shadow-sm"
                    title="Next Page"
                >
                    <ChevronRight size={14} />
                </button>

                {/* Last Page (Only show if totalPages > 2) */}
                {totalPages > 2 && (
                    <button
                        type="button"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:cursor-not-allowed transition shadow-sm"
                        title="Last Page"
                    >
                        <ChevronsRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Pagination;
