import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PenLine,
  Search,
  Shield,
  Sun,
  UserCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { initials } from '../lib/format';
import { resolveMediaUrl } from '../lib/api';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/editor', label: 'Write' },
];

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  }`;

function UserAvatar({ user, size = 'md' }) {
  const classes = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  if (user?.avatar) {
    return <img src={resolveMediaUrl(user.avatar)} alt="" className={`${classes} rounded-full object-cover`} />;
  }
  return (
    <span className={`flex ${classes} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 font-bold text-white`}>
      {initials(user?.name)}
    </span>
  );
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
    setQuery(new URLSearchParams(location.search).get('search') || '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/explore?search=${encodeURIComponent(trimmed)}` : '/explore');
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    toast.success('You have been signed out.');
    navigate('/');
  };

  const dropdownItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: `/users/${user?.id || ''}`, label: 'Profile', icon: UserCircle2 },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-lg text-lg font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white"
            aria-label="BlogSphere home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <PenLine size={18} aria-hidden="true" />
            </span>
            <span className="font-serif">Blog<span className="text-indigo-600 dark:text-indigo-400">Sphere</span></span>
          </Link>

          <nav aria-label="Main navigation" className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <form onSubmit={handleSearch} role="search" className="ml-auto hidden max-w-xs flex-1 sm:block">
            <label htmlFor="site-search" className="sr-only">
              Search articles
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="site-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stories…"
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-950/60"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:ml-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
            </button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                  aria-label="Open account menu"
                  className="ml-1 flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:ring-indigo-800"
                >
                  <UserAvatar user={user} />
                </button>

                {dropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-fade-in dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    {dropdownItems.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Icon size={16} className="text-slate-400" aria-hidden="true" /> {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 focus:outline-none focus-visible:bg-rose-50 dark:border-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <LogOut size={16} aria-hidden="true" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ml-1 hidden items-center gap-2 sm:flex">
                <Link
                  to="/login"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                >
                  Get started
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} role="search" className="pb-3 sm:hidden">
          <label htmlFor="mobile-search" className="sr-only">
            Search articles
          </label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="mobile-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stories…"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-600"
            />
          </div>
        </form>

        {menuOpen && (
          <nav aria-label="Mobile navigation" className="border-t border-slate-200 py-2 md:hidden dark:border-slate-800">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                <span className="block px-1 py-1">{link.label}</span>
              </NavLink>
            ))}
            {user ? (
              <>
                {dropdownItems.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                    <Icon size={16} aria-hidden="true" /> {label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut size={16} aria-hidden="true" /> Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-2 py-2 sm:hidden">
                <Link to="/login" className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  Log in
                </Link>
                <Link to="/register" className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white">
                  Get started
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
