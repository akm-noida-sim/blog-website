const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

export function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  return (
    <span
      role="status"
      aria-label={`${label}…`}
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
    />
  );
}

export function Loading({ label = 'Loading content', className = '' }) {
  return (
    <div className={`flex min-h-[16rem] w-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 ${className}`}>
      <Spinner size="lg" label={label} className="text-indigo-600 dark:text-indigo-400" />
      <p className="text-sm">{label}…</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" aria-hidden="true">
      <div className="aspect-[16/9] animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800/70" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}

export default Spinner;
