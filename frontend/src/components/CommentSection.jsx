import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CornerDownRight, MessageCircle, Pencil, Send, Trash2 } from 'lucide-react';
import api, { resolveMediaUrl } from '../lib/api';
import { initials, relativeTime } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loading } from './Spinner';
import EmptyState from './EmptyState';

const getId = (item) => item?.id || item?._id;

function updateTree(comments, id, updater) {
  return comments.map((comment) =>
    getId(comment) === id
      ? updater(comment)
      : { ...comment, replies: updateTree(comment.replies || [], id, updater) },
  );
}

function CommentItem({ comment, depth, user, isAdmin, onReply, onEditStart, onSave, onCancelEdit, onDelete, editingId, editValue, setEditValue, busyId }) {
  const id = getId(comment);
  const canModify = Boolean(user && (user.id === comment.author?.id || isAdmin));
  const avatar = comment.author?.avatar;

  return (
    <div className={depth > 0 ? 'ml-3 border-l border-slate-200 pl-3 sm:ml-5 sm:pl-5 dark:border-slate-700' : ''}>
      <article className="py-3">
        <div className="flex gap-3">
          {avatar ? (
            <img src={resolveMediaUrl(avatar)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-xs font-bold text-white">
              {initials(comment.author?.name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <Link
                to={`/users/${comment.author?.id || ''}`}
                className="font-semibold text-slate-900 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white dark:hover:text-indigo-400"
              >
                {comment.author?.name || 'Unknown'}
              </Link>
              <time dateTime={comment.createdAt} className="text-xs text-slate-500 dark:text-slate-400">
                {relativeTime(comment.createdAt)}
              </time>
            </div>

            {editingId === id ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onSave(id);
                }}
                className="mt-2"
              >
                <label htmlFor={`edit-comment-${id}`} className="sr-only">
                  Edit comment
                </label>
                <textarea
                  id={`edit-comment-${id}`}
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950/60"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={busyId === id || !editValue.trim()}
                    className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {busyId === id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {comment.content}
              </p>
            )}

            {editingId !== id && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                {user && (
                  <button
                    type="button"
                    onClick={() => onReply(comment)}
                    className="inline-flex items-center gap-1 rounded transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400"
                  >
                    <CornerDownRight size={13} aria-hidden="true" /> Reply
                  </button>
                )}
                {canModify && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEditStart(comment)}
                      className="inline-flex items-center gap-1 rounded transition hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-indigo-400"
                    >
                      <Pencil size={13} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(comment)}
                      disabled={busyId === id}
                      className="inline-flex items-center gap-1 rounded transition hover:text-rose-600 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:text-rose-400"
                    >
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {comment.replies?.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentItem
              key={getId(reply)}
              comment={reply}
              depth={depth + 1}
              user={user}
              isAdmin={isAdmin}
              onReply={onReply}
              onEditStart={onEditStart}
              onSave={onSave}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
              editingId={editingId}
              editValue={editValue}
              setEditValue={setEditValue}
              busyId={busyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const textareaRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadComments = useCallback(async () => {
    try {
      const { data } = await api.get(`/posts/${postId}/comments`);
      setComments(data?.comments || []);
      setCount(data?.count ?? (data?.comments?.length || 0));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !user) return;

    setSubmitting(true);
    try {
      await api.post(`/posts/${postId}/comments`, {
        content: trimmed,
        ...(replyTo ? { parentId: getId(replyTo) } : {}),
      });
      setContent('');
      setReplyTo(null);
      await loadComments();
      toast.success(replyTo ? 'Reply posted.' : 'Comment posted.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async (id) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setBusyId(id);
    try {
      await api.put(`/comments/${id}`, { content: trimmed });
      setComments((current) => updateTree(current, id, (comment) => ({ ...comment, content: trimmed })));
      setEditingId(null);
      setEditValue('');
      toast.success('Comment updated.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (comment) => {
    const id = getId(comment);
    if (!window.confirm('Delete this comment and all of its replies?')) return;
    setBusyId(id);
    try {
      await api.delete(`/comments/${id}`);
      await loadComments();
      if (editingId === id) {
        setEditingId(null);
        setEditValue('');
      }
      toast.success('Comment deleted.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section aria-labelledby="comments-heading" className="border-t border-slate-200 pt-10 dark:border-slate-800">
      <div className="mb-6 flex items-center gap-3">
        <MessageCircle size={22} className="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <h2 id="comments-heading" className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
          Discussion
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {count}
        </span>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              <span>Replying to <strong>{replyTo.author?.name}</strong></span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          )}
          <label htmlFor="new-comment" className="sr-only">
            Write a comment
          </label>
          <textarea
            id="new-comment"
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Share your thoughts…"
            className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950/60"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{content.length}/1000</span>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              {submitting ? 'Posting…' : <Send size={15} aria-hidden="true" />}
              {replyTo ? 'Reply' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            Sign in
          </Link>{' '}
          to join the conversation.
        </div>
      )}

      {loading ? (
        <Loading label="Loading comments" />
      ) : comments.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {comments.map((comment) => (
            <CommentItem
              key={getId(comment)}
              comment={comment}
              depth={0}
              user={user}
              isAdmin={isAdmin}
              onReply={handleReply}
              onEditStart={(item) => {
                setEditingId(getId(item));
                setEditValue(item.content || '');
              }}
              onSave={handleSave}
              onCancelEdit={() => {
                setEditingId(null);
                setEditValue('');
              }}
              onDelete={handleDelete}
              editingId={editingId}
              editValue={editValue}
              setEditValue={setEditValue}
              busyId={busyId}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageCircle}
          title="No comments yet"
          description="Be the first to start the conversation."
        />
      )}
    </section>
  );
}
