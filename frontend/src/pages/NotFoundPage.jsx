import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <p className="font-serif text-8xl font-bold text-indigo-100 dark:text-indigo-950/80" aria-hidden="true">404</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">This page took a different turn</h1>
        <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
          The page you're looking for doesn't exist or has moved. Let's get you back to the stories.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back home
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Compass size={16} aria-hidden="true" /> Explore stories
          </Link>
        </div>
      </div>
    </section>
  );
}
