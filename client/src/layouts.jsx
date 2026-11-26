import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from './api';
import { useAuth } from './auth';
import { roleLabel } from './data';
import { Logo } from './ui';

const publicLinks = [
  ['/athletes', 'Athletes'],
  ['/clubs', 'Clubs'],
  ['/tournaments', 'Tournaments'],
  ['/opportunities', 'Opportunities'],
  ['/about', 'About'],
];

const dashboardLinks = {
  athlete: [
    ['/app/athlete', 'Overview'],
    ['/app/athlete/profile', 'Profile'],
    ['/app/athlete/applications', 'Applications'],
    ['/app/athlete/performance', 'Performance'],
  ],
  coach: [['/app/coach', 'Teams']],
  scout: [['/app/scout', 'Discover'], ['/app/scout/shortlist', 'Shortlist']],
  club_admin: [['/app/club', 'Club']],
  organizer: [['/app/organizer', 'Tournaments'], ['/app/organizer/opportunities', 'Opportunities']],
  super_admin: [['/app/admin', 'Platform']],
};

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/app/athlete' || to === '/app/scout' || to === '/app/organizer'}
      onClick={onClick}
      className={({ isActive }) => `block rounded-2xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-white/15 text-white' : 'text-sand/80 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </NavLink>
  );
}

export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#content">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-sand/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" aria-label="Garissa SportsConnect home"><Logo /></Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold md:flex" aria-label="Primary">
            {publicLinks.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'text-green' : 'text-ink/80 hover:text-ink'}>{label}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to="/app" className="rounded-full bg-green px-4 py-2 text-sm font-semibold text-white">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold">Log in</Link>
                <Link to="/register" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-sand">Join</Link>
              </>
            )}
          </div>
          <button type="button" className="rounded-full border border-line px-3 py-2 text-sm font-semibold md:hidden" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
        </div>
        {open ? (
          <nav className="space-y-1 border-t border-line px-4 py-3 md:hidden" aria-label="Mobile">
            {publicLinks.map(([to, label]) => <NavLink key={to} to={to} className="block rounded-xl px-3 py-2 font-semibold">{label}</NavLink>)}
            {user ? <Link to="/app" className="block rounded-xl px-3 py-2 font-semibold">Dashboard</Link> : (
              <>
                <Link to="/login" className="block rounded-xl px-3 py-2 font-semibold">Log in</Link>
                <Link to="/register" className="block rounded-xl px-3 py-2 font-semibold">Join</Link>
              </>
            )}
          </nav>
        ) : null}
      </header>
      <main id="content"><Outlet /></main>
      <footer className="mt-16 border-t border-line bg-green-deep text-sand">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm text-sand/75">Connecting talent, empowering athletes, and keeping Garissa sport in one record.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Explore</p>
            <div className="mt-3 flex flex-col gap-2 text-sand/80">
              <Link to="/sports">Sports</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/tournaments">Fixtures</Link>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">County</p>
            <p className="mt-3 text-sand/75">Garissa Township, Balambala, Lagdera, Dadaab, Fafi, Ijara, and Hulugho.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    api.get('/notifications').then((res) => setUnread(res.data.data.unread)).catch(() => {});
  }, [location.pathname]);

  const links = dashboardLinks[user?.role] || [];

  return (
    <div className="min-h-screen bg-sand lg:grid lg:grid-cols-[16.5rem_1fr]">
      <a className="skip-link" href="#content">Skip to content</a>
      {open ? <button type="button" className="fixed inset-0 z-30 bg-ink/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-green-deep px-4 py-5 text-sand transition lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/" aria-label="Public site"><Logo light /></Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-sand/50">{roleLabel(user?.role)}</p>
        <p className="truncate text-sm font-semibold">{user?.name}</p>
        <nav className="mt-6 space-y-1" aria-label="Dashboard">
          {links.map(([to, label]) => <NavItem key={to} to={to} onClick={() => setOpen(false)}>{label}</NavItem>)}
          <NavItem to="/app/notifications" onClick={() => setOpen(false)}>Notifications{unread ? ` (${unread})` : ''}</NavItem>
          <NavItem to="/app/account" onClick={() => setOpen(false)}>Account</NavItem>
        </nav>
        <div className="mt-auto space-y-2 pt-6">
          <Link to="/athletes" className="block rounded-2xl px-3 py-2 text-sm font-semibold text-sand/80 hover:bg-white/10" onClick={() => setOpen(false)}>Public site</Link>
          <button type="button" className="w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold text-sand/80 hover:bg-white/10" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>Log out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
          <button type="button" className="rounded-full border border-line px-3 py-2 text-sm font-semibold" onClick={() => setOpen(true)}>Menu</button>
          <Link to="/app/notifications" className="text-sm font-semibold">Alerts{unread ? ` (${unread})` : ''}</Link>
        </div>
        <main id="content" className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
      </div>
    </div>
  );
}
