import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <PenLine size={16} aria-hidden="true" />
            </span>
            Blog<span className="text-indigo-600 dark:text-indigo-400">Sphere</span>
          </Link>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            A home for thoughtful writing, fresh ideas and conversations worth having.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link to="/" className="rounded hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400">Home</Link>
          <Link to="/explore" className="rounded hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400">Explore</Link>
          <Link to="/editor" className="rounded hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400">Write</Link>
          <Link to="/dashboard" className="rounded hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400">Dashboard</Link>
        </nav>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400 dark:border-slate-900">
        © {new Date().getFullYear()} BlogSphere. Made for readers and writers.
      </div>
    </footer>
  );
}
