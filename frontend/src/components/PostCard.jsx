import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, PenLine } from 'lucide-react';
import { resolveMediaUrl } from '../lib/api';
import { formatNumber, formatShortDate, initials } from '../lib/format';

function CoverImage({ src, title, featured }) {
  const [failed, setFailed] = useState(false);
  const url = resolveMediaUrl(src);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${
        featured ? 'aspect-[16/10] sm:aspect-[16/8]' : 'aspect-[16/9]'
      }`}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={`Cover for ${title}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-emerald-100 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950">
          <PenLine size={30} className="text-indigo-400/70 dark:text-indigo-400" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, featured = false }) {
  const href = `/posts/${post.slug || post.id}`;
  const category = post.categories?.[0];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="block">
        <CoverImage src={post.featuredImage} title={post.title} featured={featured} />
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          {category && <span className="uppercase tracking-wide">{category}</span>}
          {category && <span className="text-slate-300 dark:text-slate-600">•</span>}
          <time dateTime={post.publishedAt || post.createdAt} className="text-slate-500 dark:text-slate-400">
            {formatShortDate(post.publishedAt || post.createdAt)}
          </time>
        </div>

        <h3 className={`mt-3 font-serif font-bold leading-snug text-slate-900 transition group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300 ${featured ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
          <Link to={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{post.excerpt}</p>
        )}

        {post.tags?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                to={`/explore?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Link
            to={`/users/${post.author?.id || ''}`}
            className="flex min-w-0 items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {post.author?.avatar ? (
              <img
                src={resolveMediaUrl(post.author.avatar)}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-[10px] font-bold text-white">
                {initials(post.author?.name)}
              </span>
            )}
            <span className="truncate font-medium text-slate-700 dark:text-slate-200">{post.author?.name || 'Unknown author'}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex items-center gap-1" aria-label={`${post.likeCount || 0} likes`}>
              <Heart size={14} aria-hidden="true" /> {formatNumber(post.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1" aria-label={`${post.commentCount || 0} comments`}>
              <MessageCircle size={14} aria-hidden="true" /> {formatNumber(post.commentCount)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
