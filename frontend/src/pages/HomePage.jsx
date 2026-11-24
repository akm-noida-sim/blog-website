import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PenLine, Sparkles } from 'lucide-react';
import api from '../lib/api';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

const BASE_CATEGORIES = ['Technology', 'Development', 'Design', 'Backend', 'Frontend', 'Science', 'Business', 'Lifestyle', 'Culture'];

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState(BASE_CATEGORIES);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const params = { page, limit: 9 };
    if (category) params.category = category;

    Promise.allSettled([api.get('/posts/featured', { params: { limit: 3 } }), api.get('/posts', { params })])
      .then(([featuredResult, postsResult]) => {
        if (!active) return;
        setFeatured(featuredResult.status === 'fulfilled' ? featuredResult.value.data?.posts || [] : []);
        if (postsResult.status === 'fulfilled') {
          setPosts(postsResult.value.data?.posts || []);
          setPagination(postsResult.value.data?.pagination || null);
        } else {
          setPosts([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, category]);

  useEffect(() => {
    setCategories((current) => {
      const found = [...posts, ...featured].flatMap((post) => post.categories || []);
      return Array.from(new Set([...current, ...found])).sort((a, b) => a.localeCompare(b));
    });
  }, [posts, featured]);

  const handleCategory = (next) => {
    setCategory(next);
    setPage(1);
  };

  return (
    <div>
      <section className="border-b border-slate-100 bg-gradient-to-b from-indigo-50/70 to-white dark:border-slate-900 dark:from-indigo-950/30 dark:to-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Sparkles size={13} aria-hidden="true" /> Ideas worth sharing
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
            Stories that stay with you.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            Discover thoughtful writing from the BlogSphere community — or share your own perspective with readers around the world.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              Explore stories <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to={user ? '/editor' : '/register'}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
            >
              <PenLine size={16} aria-hidden="true" /> Start writing
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {featured.length > 0 && (
          <section aria-labelledby="featured-heading" className="mb-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Editor's picks</p>
                <h2 id="featured-heading" className="mt-1 font-serif text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                  Featured stories
                </h2>
              </div>
              <Link to="/explore?sort=popular" className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline sm:inline-flex dark:text-indigo-400">
                See more <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {featured.slice(0, 3).map((post, index) => (
                <div key={post.id} className={index === 0 && featured.length > 1 ? 'lg:col-span-2' : featured.length === 1 ? 'lg:col-span-3' : ''}>
                  <PostCard post={post} featured={index === 0} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="latest-heading">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Fresh from the community</p>
              <h2 id="latest-heading" className="mt-1 font-serif text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                Latest stories
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pagination?.total ? `${pagination.total} ${pagination.total === 1 ? 'story' : 'stories'}` : ''}
            </p>
          </div>

          <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
            {[{ name: '', label: 'All' }, ...categories.map((name) => ({ name, label: name }))].map((item) => (
              <button
                key={item.name || 'all'}
                type="button"
                onClick={() => handleCategory(item.name)}
                aria-pressed={category === item.name}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  category === item.name
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300'
                }`}
              >
                {item.label}
              </button>
            ))}
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
              <Pagination pagination={pagination} onChange={setPage} />
            </>
          ) : (
            <EmptyState
              title="No stories here yet"
              description={category ? `There are no published posts in ${category}. Try another category.` : 'Be the first to publish something wonderful.'}
              actionTo={category ? undefined : user ? '/editor' : '/register'}
              actionLabel={category ? 'View all stories' : 'Start writing'}
              onAction={category ? () => handleCategory('') : undefined}
            />
          )}
        </section>
      </div>
    </div>
  );
}
