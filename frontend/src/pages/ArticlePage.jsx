import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Clock3, Eye, Heart, Link2, Share2 } from 'lucide-react';
import api, { resolveMediaUrl } from '../lib/api';
import { formatNumber, formatShortDate, initials, readingTime } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loading } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import CommentSection from '../components/CommentSection';

function Cover({ post }) {
  const [failed, setFailed] = useState(false);
  const url = resolveMediaUrl(post.featuredImage);
  if (!url || failed) return null;
  return (
    <img
      src={url}
      alt={`Cover for ${post.title}`}
      onError={() => setFailed(true)}
      className="mb-10 aspect-[16/8] w-full rounded-2xl object-cover shadow-soft"
    />
  );
}

export default function ArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    api
      .get(`/posts/${id}`)
      .then(({ data }) => {
        if (active) setPost(data?.post || null);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 404) setNotFound(true);
        else toast.error(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleLike = async () => {
    if (!user) {
      toast.info('Sign in to like this story.');
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!post || liking) return;

    setLiking(true);
    try {
      const { data } = await api.post(`/likes/${post.id}`);
      setPost((current) => ({
        ...current,
        likedByMe: data?.liked ?? !current.likedByMe,
        likeCount: data?.likeCount ?? current.likeCount,
      }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title || 'BlogSphere story', url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard.');
        return;
      }
      window.prompt('Copy this link:', url);
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Could not share this story.');
    }
  };

  if (loading) return <Loading label="Loading story" className="min-h-[70vh]" />;

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          title="Story not found"
          description="This story may have been removed, or you may not have permission to view it."
          actionTo="/explore"
          actionLabel="Explore stories"
        />
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link
        to="/explore"
        className="mb-8 inline-flex items-center gap-2 rounded text-sm font-medium text-slate-500 transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to explore
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        {post.categories?.map((category) => (
          <Link key={category} to={`/explore?category=${encodeURIComponent(category)}`} className="rounded-full bg-indigo-50 px-3 py-1 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60">
            {category}
          </Link>
        ))}
        {post.status === 'draft' && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Draft</span>
        )}
      </div>

      <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
        {post.title}
      </h1>

      {post.excerpt && (
        <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">{post.excerpt}</p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {post.author?.avatar ? (
            <img src={resolveMediaUrl(post.author.avatar)} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-sm font-bold text-white">
              {initials(post.author?.name)}
            </span>
          )}
          <div>
            <Link
              to={`/users/${post.author?.id || ''}`}
              className="block font-semibold text-slate-900 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white dark:hover:text-indigo-400"
            >
              {post.author?.name || 'Unknown author'}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <time dateTime={post.publishedAt || post.createdAt}>{formatShortDate(post.publishedAt || post.createdAt)}</time>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1"><Clock3 size={12} aria-hidden="true" /> {readingTime(post.content)}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1"><Eye size={12} aria-hidden="true" /> {formatNumber(post.views)} views</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLike}
            disabled={liking}
            aria-pressed={Boolean(post.likedByMe)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              post.likedByMe
                ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-800'
            }`}
          >
            <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} aria-hidden="true" />
            {formatNumber(post.likeCount)}
            <span className="sr-only">{post.likedByMe ? 'Unlike this story' : 'Like this story'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this story"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
          >
            <Share2 size={16} aria-hidden="true" /> <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      <Cover post={post} />

      <div className="prose-blogsphere mt-10 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content || ''}</ReactMarkdown>
      </div>

      {post.tags?.length > 0 && (
        <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-6 dark:border-slate-800">
          <Link2 size={15} className="text-slate-400" aria-hidden="true" />
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/explore?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-14">
        <CommentSection postId={post.id} />
      </div>
    </article>
  );
}
