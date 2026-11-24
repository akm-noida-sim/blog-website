import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, Heart, MessageCircle, Shield, Trash2, Users, Eye } from 'lucide-react';
import api, { resolveMediaUrl } from '../lib/api';
import { formatNumber, formatShortDate, initials } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loading } from '../components/Spinner';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';

const TABS = [
  { value: 'overview', label: 'Overview', icon: BarChart3 },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'posts', label: 'Posts', icon: FileText },
];

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [userPagination, setUserPagination] = useState(null);
  const [postPagination, setPostPagination] = useState(null);
  const [userPage, setUserPage] = useState(1);
  const [postPage, setPostPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get('/admin/stats')
      .then(({ data }) => {
        if (active) setStats(data?.stats || null);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'users') return undefined;
    let active = true;
    setLoading(true);
    api
      .get('/admin/users', { params: { page: userPage, limit: 10 } })
      .then(({ data }) => {
        if (!active) return;
        setUsers(data?.users || []);
        setUserPagination(data?.pagination || null);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, userPage]);

  useEffect(() => {
    if (tab !== 'posts') return undefined;
    let active = true;
    setLoading(true);
    api
      .get('/admin/posts', { params: { page: postPage, limit: 10 } })
      .then(({ data }) => {
        if (!active) return;
        setPosts(data?.posts || []);
        setPostPagination(data?.pagination || null);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, postPage]);

  const handleRole = async (target, role) => {
    setBusyId(target.id);
    try {
      const { data } = await api.put(`/admin/users/${target.id}/role`, { role });
      const updated = data?.user;
      setUsers((current) => current.map((item) => (item.id === target.id ? { ...item, role: updated?.role || role } : item)));
      toast.success(`${target.name} is now ${role === 'admin' ? 'an admin' : 'a member'}.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (target) => {
    if (target.id === currentUser?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Delete ${target.name} and all of their content? This cannot be undone.`)) return;
    setBusyId(target.id);
    try {
      await api.delete(`/admin/users/${target.id}`);
      setUsers((current) => current.filter((item) => item.id !== target.id));
      toast.success('User deleted.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusyId(post.id);
    try {
      await api.delete(`/admin/posts/${post.id}`);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success('Story deleted.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const statCards = [
    { label: 'Users', key: 'users', icon: Users, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400' },
    { label: 'Posts', key: 'posts', icon: FileText, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400' },
    { label: 'Published', key: 'publishedPosts', icon: Shield, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400' },
    { label: 'Drafts', key: 'drafts', icon: BarChart3, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400' },
    { label: 'Comments', key: 'comments', icon: MessageCircle, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400' },
    { label: 'Likes', key: 'likes', icon: Heart, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400' },
    { label: 'Views', key: 'views', icon: Eye, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Administration</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">Admin console</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Manage members, moderate content and keep an eye on the platform.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Admin sections">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              tab === value
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading admin data" />
      ) : tab === 'overview' ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ label, key, icon: Icon, color }) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon size={19} aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(stats?.[key] || 0)}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      ) : tab === 'users' ? (
        <div>
          {users.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Member</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {item.avatar ? (
                            <img src={resolveMediaUrl(item.avatar)} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-xs font-bold text-white">{initials(item.name)}</span>
                          )}
                          <div className="min-w-0">
                            <Link to={`/users/${item.id}`} className="block font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">{item.name}</Link>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatShortDate(item.createdAt)}</td>
                      <td className="px-5 py-3">
                        <label htmlFor={`role-${item.id}`} className="sr-only">Role for {item.name}</label>
                        <select
                          id={`role-${item.id}`}
                          value={item.role || 'user'}
                          disabled={busyId === item.id || item.id === currentUser?.id}
                          onChange={(event) => handleRole(item, event.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(item)}
                          disabled={busyId === item.id || item.id === currentUser?.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 size={13} aria-hidden="true" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No users found" description="There are no members to display on this page." />
          )}
          <Pagination pagination={userPagination} onChange={setUserPage} />
        </div>
      ) : (
        <div>
          {posts.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Story</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Author</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Stats</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <Link to={`/posts/${post.slug || post.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                          {post.title}
                        </Link>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{formatShortDate(post.createdAt)}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{post.author?.name || 'Unknown'}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${post.status === 'published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatNumber(post.views)} views · {formatNumber(post.likeCount)} likes
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post)}
                          disabled={busyId === post.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 size={13} aria-hidden="true" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No posts found" description="There are no stories to display on this page." />
          )}
          <Pagination pagination={postPagination} onChange={setPostPage} />
        </div>
      )}
    </div>
  );
}
