import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function EmptyState({
  icon: Icon = FileQuestion,
  title = 'Nothing here yet',
  description = '',
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>}
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          {actionLabel || 'Continue'}
        </button>
      ) : (
        actionTo && (
          <Link
            to={actionTo}
            className="mt-5 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {actionLabel || 'Continue'}
          </Link>
        )
      )}
    </div>
  );
}
