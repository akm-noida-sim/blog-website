import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageItems(current, total) {
  const items = [];
  for (let page = 1; page <= total; page += 1) {
    if (page === 1 || page === total || Math.abs(page - current) <= 1) {
      items.push(page);
    } else if (items[items.length - 1] !== '…') {
      items.push('…');
    }
  }
  return items;
}

export default function Pagination({ pagination, onChange }) {
  const current = Number(pagination?.page) || 1;
  const total = Number(pagination?.pages) || 0;

  if (total <= 1) return null;

  const baseClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={!pagination?.hasPrev}
        onClick={() => onChange(current - 1)}
        aria-label="Previous page"
        className={`${baseClass} border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700`}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      {pageItems(current, total).map((item, index) =>
        item === '…' ? (
          <span key={`ellipsis-${index}`} className="px-1 text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === current ? 'page' : undefined}
            className={`${baseClass} ${
              item === current
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700'
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={!pagination?.hasNext}
        onClick={() => onChange(current + 1)}
        aria-label="Next page"
        className={`${baseClass} border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700`}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
