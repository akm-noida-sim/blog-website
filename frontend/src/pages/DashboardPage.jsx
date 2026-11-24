import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Heart, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { resolveMediaUrl } from '../lib/api';
import { formatNumber, formatShortDate, initials } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { Loading } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 8;
const TABS = [
  { value: 'all', label: 'All posts' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];

export default function DashboardPage() {
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setLoading(true);
      try {
        const collected = [];
        let pageNumber = 1;
        // Fetch all pages so the dashboard statistics cover the whole library.
        while (pageNumber <= 20) {
          const { data } = await api.get('/posts/mine', { params: { page: pageNumber, limit: 50 } });
          collected.push(...(data?.posts || []));
          if (!data?.pagination?.hasNext) break;
          pageNumber += 1;
        }
        if (active) setPosts(collected);
      } catch (error) {
        if (active) toast.error(error.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPosts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const stats = useMemo(
    () =>
      posts.reduce(
        (totals, post) => ({
          posts: totals.posts + 1,
          views: totals.views + (Number(post.views) || 0),
          likes: totals.likes + (Number(post.likeCount) || 0),
          comments: totals.comments + (Number(post.commentCount) || 0),
        }),
        { posts: 0, views: 0, likes: 0, comments: 0 },
      ),
    [posts],
  );

  const filtered = useMemo(() => (tab === 'all' ? posts : posts.filter((post) => post.status === tab)), [posts, tab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pagination = {
    page: safePage,
    pages: totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setDeletingId(post.id);
    try {
      await api.delete(`/posts/${post.id}`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success('Story deleted.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const statCards = [
    { label: 'Total posts', value: stats.posts, icon: FileText, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400' },
    { label: 'Views', value: stats.views, icon: Eye, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400' },
    { label: 'Likes', value: stats.likes, icon: Heart, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400' },
    { label: 'Comments', value: stats.comments, icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Your workspace</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">Dashboard</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your stories and see how they're doing.</p>
        </div>
        <Link
          to="/editor"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <Plus size={16} aria-hidden="true" /> New story
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon size={19} aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(value)}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Filter your posts">
        {TABS.map((item) => {
          const count = item.value === 'all' ? posts.length : posts.filter((post) => post.status === item.value).length;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => setTab(item.value)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                tab === item.value
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {item.label} <span className="ml-1 text-xs text-slate-400">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loading label="Loading your stories" />
      ) : visible.length > 0 ? (
        <>
          <div className="space-y-3">
            {visible.map((post) => (
              <div key={post.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-indigo-200 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                {post.featuredImage ? (
                  <img src={resolveMediaUrl(post.featuredImage)} alt="" className="h-20 w-full shrink-0 rounded-xl object-cover sm:w-28" />
                ) : (
                  <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-emerald-100 text-xs font-semibold text-indigo-500 sm:w-28 dark:from-indigo-950 dark:to-emerald-950">
                    No cover
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {post.featured && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">Featured</span>}
                    <time dateTime={post.createdAt} className="text-xs text-slate-500 dark:text-slate-400">
                      {formatShortDate(post.createdAt)}
                    </time>
                  </div>
                  <h2 className="mt-2 truncate font-serif text-lg font-bold text-slate-900 dark:text-white">
                    <Link to={`/posts/${post.slug || post.id}`} className="rounded hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400">
                      {post.title}
                    </Link>
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><Eye size={12} aria-hidden="true" /> {formatNumber(post.views)} views</span>
                    <span className="inline-flex items-center gap-1"><Heart size={12} aria-hidden="true" /> {formatNumber(post.likeCount)} likes</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle size={12} aria-hidden="true" /> {formatNumber(post.commentCount)} comments</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    to={`/posts/${post.slug || post.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-300"
                  >
                    View
                  </Link>
                  <Link
                    to={`/editor/${post.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    disabled={deletingId === post.id}
                    aria-label={`Delete ${post.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 size={13} aria-hidden="true" /> {deletingId === post.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination pagination={pagination} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          title={tab === 'draft' ? 'No drafts yet' : 'No stories yet'}
          description={tab === 'draft' ? 'Stories you save as drafts will appear here.' : 'Your published stories will appear here.'}
          actionTo="/editor"
          actionLabel="Write a story"
        />
      )}
    </div>
  );
}
