import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  page = 1,
  pages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  className = ''
}) => {
  const totalPages = Math.max(1, pages);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const handlePrev = () => {
    if (page > 1 && onPageChange) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages && onPageChange) {
      onPageChange(page + 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const list = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  };

  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-2 ${className}`.trim()}
      aria-label="Pagination Navigation"
    >
      <div className="text-sm text-text-muted">
        Showing <span className="font-semibold text-text">{startItem}</span> to{' '}
        <span className="font-semibold text-text">{endItem}</span> of{' '}
        <span className="font-semibold text-text">{total}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={page <= 1}
          aria-label="Previous Page"
          className="h-9 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-lg border border-border bg-surface text-text hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onPageChange && onPageChange(num)}
              aria-label={`Page ${num}`}
              aria-current={num === page ? 'page' : undefined}
              className={`h-9 min-w-[36px] px-2 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                num === page
                  ? 'bg-primary text-white border border-primary'
                  : 'bg-surface text-text border border-border hover:bg-surface-muted'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={page >= totalPages}
          aria-label="Next Page"
          className="h-9 px-3 inline-flex items-center gap-1 text-xs font-medium rounded-lg border border-border bg-surface text-text hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
