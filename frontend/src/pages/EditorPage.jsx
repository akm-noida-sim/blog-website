import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Save, Trash2, UploadCloud } from 'lucide-react';
import api, { resolveMediaUrl } from '../lib/api';
import { parseList } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loading, Spinner } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import MarkdownEditor from '../components/MarkdownEditor';

const EMPTY_POST = {
  title: '',
  excerpt: '',
  content: '',
  featuredImage: '',
  categories: '',
  tags: '',
  status: 'draft',
  featured: false,
};

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    setLoading(true);

    api
      .get(`/posts/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const post = data?.post;
        if (!post) return;
        const owner = post.author?.id === user?.id;
        if (!owner && !isAdmin) {
          setUnauthorized(true);
          return;
        }
        setForm({
          title: post.title || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          featuredImage: post.featuredImage || '',
          categories: (post.categories || []).join(', '),
          tags: (post.tags || []).join(', '),
          status: post.status || 'draft',
          featured: Boolean(post.featured),
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 403 || error.status === 404) setUnauthorized(true);
        else toast.error(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isAdmin, user?.id]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Images must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload', formData);
      setField('featuredImage', data.url);
      toast.success('Image uploaded.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();

    if (title.length < 3 || title.length > 150) {
      toast.error('Title must be between 3 and 150 characters.');
      return;
    }
    if (content.length < 20) {
      toast.error('Your story needs at least 20 characters of content.');
      return;
    }

    const payload = {
      title,
      content,
      excerpt: form.excerpt.trim(),
      featuredImage: form.featuredImage.trim(),
      categories: parseList(form.categories).slice(0, 5),
      tags: parseList(form.tags).slice(0, 10),
      status: form.status,
      featured: form.featured,
    };

    setSaving(true);
    try {
      const { data } = await (id ? api.put(`/posts/${id}`, payload) : api.post('/posts', payload));
      toast.success(data?.message || (id ? 'Story updated.' : 'Story created.'));
      const post = data?.post;
      navigate(post ? `/posts/${post.slug || post.id}` : '/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading editor" className="min-h-[70vh]" />;

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState
          title="You can't edit this story"
          description="Only the author or an administrator can make changes to this post."
          actionTo="/dashboard"
          actionLabel="Back to dashboard"
        />
      </div>
    );
  }

  const previewUrl = resolveMediaUrl(form.featuredImage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{id ? 'Edit story' : 'New story'}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
            {id ? 'Refine your story' : 'Tell your story'}
          </h1>
        </div>
        <Link to={id ? `/posts/${id}` : '/dashboard'} className="rounded text-sm font-medium text-slate-500 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div>
            <label htmlFor="post-title" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Title</label>
            <input
              id="post-title"
              type="text"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              maxLength={150}
              placeholder="An honest, compelling title"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-serif text-2xl font-bold leading-snug text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600 dark:focus:ring-indigo-950/60"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{form.title.length}/150</p>
          </div>

          <div>
            <label htmlFor="post-excerpt" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Excerpt <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea
              id="post-excerpt"
              value={form.excerpt}
              onChange={(event) => setField('excerpt', event.target.value)}
              rows={3}
              placeholder="A short summary shown on story cards."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950/60"
            />
          </div>

          <div>
            <label htmlFor="markdown-content" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Story</label>
            <MarkdownEditor value={form.content} onChange={(value) => setField('content', value)} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Publish</h2>
            <fieldset>
              <legend className="sr-only">Post status</legend>
              <div className="space-y-2">
                {[
                  { value: 'draft', label: 'Draft', description: 'Only you can see this story.' },
                  { value: 'published', label: 'Published', description: 'Visible to everyone.' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      form.status === option.value
                        ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-600 dark:bg-indigo-950/40'
                        : 'border-slate-200 hover:border-indigo-200 dark:border-slate-700 dark:hover:border-indigo-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={form.status === option.value}
                      onChange={() => setField('status', option.value)}
                      className="mt-0.5 h-4 w-4 accent-indigo-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{option.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setField('featured', event.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600"
              />
              Feature this story on the home page
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              {saving ? <Spinner size="sm" label="Saving" /> : <Save size={16} aria-hidden="true" />}
              {saving ? 'Saving…' : id ? 'Update story' : 'Publish / save'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="post-categories" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Categories</label>
                <input
                  id="post-categories"
                  type="text"
                  value={form.categories}
                  onChange={(event) => setField('categories', event.target.value)}
                  placeholder="Development, Design"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950/60"
                />
                <p className="mt-1 text-xs text-slate-400">Separate with commas (max 10).</p>
              </div>
              <div>
                <label htmlFor="post-tags" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Tags</label>
                <input
                  id="post-tags"
                  type="text"
                  value={form.tags}
                  onChange={(event) => setField('tags', event.target.value)}
                  placeholder="react, javascript"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950/60"
                />
                <p className="mt-1 text-xs text-slate-400">Separate with commas (max 10).</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Featured image</h2>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleUpload} className="sr-only" aria-label="Upload featured image" />
            {previewUrl ? (
              <div className="space-y-3">
                <img src={previewUrl} alt="Featured image preview" className="aspect-[16/9] w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setField('featuredImage', '')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                >
                  <Trash2 size={13} aria-hidden="true" /> Remove image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400 dark:hover:border-indigo-700"
              >
                {uploading ? <Spinner size="md" label="Uploading image" className="text-indigo-600" /> : <UploadCloud size={22} className="text-indigo-500" aria-hidden="true" />}
                {uploading ? 'Uploading…' : 'Click to upload an image'}
                <span className="text-xs text-slate-400">PNG, JPG, GIF or WEBP · max 5 MB</span>
              </button>
            )}
            {previewUrl && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
              >
                <ImagePlus size={13} aria-hidden="true" /> Replace image
              </button>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
