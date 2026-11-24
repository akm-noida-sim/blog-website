import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Spinner';

const CATEGORIES = ['Technology', 'Development', 'Design', 'Backend', 'Frontend', 'Science', 'Business', 'Lifestyle', 'Culture'];
const SORTS = [
  { value: 'latest', label: 'Latest first' },
  { value: 'popular', label: 'Most popular' },
  { value: 'oldest', label: 'Oldest first' },
];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'latest';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [tagInput, setTagInput] = useState(tag);
  const lastSearch = useRef(search);
  const lastTag = useRef(tag);

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (search !== lastSearch.current) {
      lastSearch.current = search;
      setSearchInput(search);
    }
  }, [search]);

  useEffect(() => {
    if (tag !== lastTag.current) {
      lastTag.current = tag;
      setTagInput(tag);
    }
  }, [tag]);

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(changes).forEach(([key, value]) => {
            if (value) next.set(key, value);
            else next.delete(key);
          });
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() !== search) updateParams({ search: searchInput.trim() });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, search, updateParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (tagInput.trim() !== tag) updateParams({ tag: tagInput.trim() });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [tagInput, tag, updateParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { page, limit: 9, sort };
    if (search) params.search = search;
    if (category) params.category = category;
    if (tag) params.tag = tag;

    api
      .get('/posts', { params })
      .then(({ data }) => {
        if (!active) return;
        setPosts(data?.posts || []);
        setPagination(data?.pagination || null);
      })
      .catch(() => {
        if (!active) return;
        setPosts([]);
        setPagination(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, sort, search, category, tag]);

  const handlePage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearchInput('');
    setTagInput('');
  };

  const hasFilters = Boolean(search || category || tag || (sort && sort !== 'latest'));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Discover</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">Explore stories</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Find something that sparks your curiosity.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="explore-search" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="explore-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Title, excerpt or content…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950/60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="explore-category" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Category
            </label>
            <select
              id="explore-category"
              value={category}
              onChange={(event) => updateParams({ category: event.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950/60"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="explore-tag" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tag
            </label>
            <input
              id="explore-tag"
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="e.g. react"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950/60"
            />
          </div>

          <div>
            <label htmlFor="explore-sort" className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <SlidersHorizontal size={13} aria-hidden="true" /> Sort by
            </label>
            <select
              id="explore-sort"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950/60"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active filters:</span>
            {search && (
              <button type="button" onClick={() => updateParams({ search: '' })} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                “{search}” <X size={12} aria-hidden="true" />
              </button>
            )}
            {category && (
              <button type="button" onClick={() => updateParams({ category: '' })} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                {category} <X size={12} aria-hidden="true" />
              </button>
            )}
            {tag && (
              <button type="button" onClick={() => updateParams({ tag: '' })} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                #{tag} <X size={12} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {loading ? 'Searching…' : `${pagination?.total ?? posts.length} ${(pagination?.total ?? posts.length) === 1 ? 'result' : 'results'}`}
        </h2>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <Pagination pagination={pagination} onChange={handlePage} />
        </>
      ) : (
        <EmptyState
          title="No matching stories"
          description="Try a different keyword, category or tag — or clear the filters to see everything."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      )}
    </div>
  );
}
