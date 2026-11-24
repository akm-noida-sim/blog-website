import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, ExternalLink, KeyRound, Pencil, UploadCloud, UserRound } from 'lucide-react';
import api, { resolveMediaUrl } from '../lib/api';
import { formatNumber, formatShortDate, initials } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loading, Spinner } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';

const EMPTY_PROFILE_FORM = { name: '', bio: '', avatar: '', website: '' };
const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const avatarRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);

  const isOwn = Boolean(currentUser && currentUser.id === id);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([
      api.get(`/users/${id}`),
      api.get(`/users/${id}/posts`, { params: { page, limit: 9 } }),
    ])
      .then(([profileResult, postsResult]) => {
        if (!active) return;
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data?.user || null);
        else setProfile(null);
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
  }, [id, page]);

  useEffect(() => {
    setEditing(false);
    setPasswordOpen(false);
    setPage(1);
  }, [id]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        website: profile.website || '',
      });
    }
  }, [profile]);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (profileForm.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: profileForm.name.trim(),
        bio: profileForm.bio.trim(),
        avatar: profileForm.avatar.trim(),
        website: profileForm.website.trim(),
      });
      if (data?.user) setProfile(data.user);
      toast.success(data?.message || 'Profile updated.');
      setEditing(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8 || !/[a-zA-Z]/.test(passwordForm.newPassword) || !/\d/.test(passwordForm.newPassword)) {
      toast.error('New password needs at least 8 characters with a letter and a number.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const { data } = await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(data?.message || 'Password changed.');
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (event) => {
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
      setProfileForm((current) => ({ ...current, avatar: data.url }));
      toast.success('Avatar uploaded. Save your profile to apply it.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) return <Loading label="Loading profile" className="min-h-[70vh]" />;

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <EmptyState title="Profile not found" description="This user may no longer be a member of BlogSphere." actionTo="/explore" actionLabel="Explore stories" />
      </div>
    );
  }

  const websiteUrl = profile.website ? (profile.website.startsWith('http') ? profile.website : `https://${profile.website}`) : '';

  return (
    <div>
      <div className="h-40 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 sm:h-52" />
      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {profile.avatar ? (
              <img
                src={resolveMediaUrl(profile.avatar)}
                alt={`${profile.name}'s avatar`}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-950"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-emerald-500 text-2xl font-bold text-white shadow-md dark:border-slate-950">
                {initials(profile.name)}
              </span>
            )}
            <div className="pb-1">
              <h1 className="font-serif text-3xl font-bold text-slate-900 dark:text-white">{profile.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" /> Joined {formatShortDate(profile.createdAt)}</span>
                <span>{formatNumber(pagination?.total || posts.length)} stories</span>
                {profile.role === 'admin' && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">Admin</span>}
              </div>
            </div>
          </div>

          {isOwn && (
            <div className="flex flex-wrap gap-2 pb-1">
              <button
                type="button"
                onClick={() => setEditing((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Pencil size={15} aria-hidden="true" /> {editing ? 'Close editor' : 'Edit profile'}
              </button>
              <button
                type="button"
                onClick={() => setPasswordOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <KeyRound size={15} aria-hidden="true" /> Change password
              </button>
            </div>
          )}
        </div>

        {profile.bio && <p className="mt-6 max-w-2xl leading-relaxed text-slate-700 dark:text-slate-300">{profile.bio}</p>}
        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
          >
            <ExternalLink size={14} aria-hidden="true" /> {profile.website}
          </a>
        )}

        {isOwn && editing && (
          <form onSubmit={handleProfileSubmit} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="sm:col-span-2">
              <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Name</label>
              <input
                id="profile-name"
                type="text"
                value={profileForm.name}
                onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Bio</label>
              <textarea
                id="profile-bio"
                rows={3}
                value={profileForm.bio}
                onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="A little about you…"
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="profile-website" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Website</label>
              <input
                id="profile-website"
                type="text"
                value={profileForm.website}
                onChange={(event) => setProfileForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="profile-avatar" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Avatar URL</label>
              <input
                id="profile-avatar"
                type="text"
                value={profileForm.avatar}
                onChange={(event) => setProfileForm((current) => ({ ...current, avatar: event.target.value }))}
                placeholder="/uploads/avatar.jpg"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleAvatarUpload} className="sr-only" aria-label="Upload avatar" />
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={uploading}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
              >
                {uploading ? <Spinner size="sm" label="Uploading" /> : <UploadCloud size={13} aria-hidden="true" />} Upload image
              </button>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </form>
        )}

        {isOwn && passwordOpen && (
          <form onSubmit={handlePasswordSubmit} className="mt-4 max-w-xl space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Change password</h2>
            {[
              { name: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
              { name: 'newPassword', label: 'New password', autoComplete: 'new-password' },
              { name: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
            ].map((field) => (
              <div key={field.name}>
                <label htmlFor={`password-${field.name}`} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{field.label}</label>
                <input
                  id={`password-${field.name}`}
                  type="password"
                  autoComplete={field.autoComplete}
                  value={passwordForm[field.name]}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={savingPassword} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
              <button type="button" onClick={() => setPasswordOpen(false)} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </form>
        )}

        <section aria-labelledby="profile-posts-heading" className="mt-14">
          <div className="mb-6 flex items-center gap-2">
            <UserRound size={20} className="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 id="profile-posts-heading" className="font-serif text-2xl font-bold text-slate-900 dark:text-white">
              Stories by {isOwn ? 'you' : profile.name}
            </h2>
          </div>

          {posts.length > 0 ? (
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
              title="No published stories yet"
              description={isOwn ? 'Your published stories will show up here.' : 'Check back soon — this writer may be working on something new.'}
              actionTo={isOwn ? '/editor' : '/explore'}
              actionLabel={isOwn ? 'Write a story' : 'Explore stories'}
            />
          )}
        </section>
      </div>
    </div>
  );
}
