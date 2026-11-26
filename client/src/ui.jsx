import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sportName } from './data';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Garissa SportsConnect` : 'Garissa SportsConnect';
  }, [title]);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

const buttonStyles = {
  primary: 'bg-green text-white hover:bg-green-dark',
  gold: 'bg-gold text-ink hover:brightness-95',
  ghost: 'bg-transparent text-ink hover:bg-black/5',
  danger: 'bg-clay text-white hover:brightness-95',
  dark: 'bg-ink text-sand hover:bg-black',
  soft: 'bg-green-soft text-green-dark hover:bg-emerald-100',
};

export function Button({ children, variant = 'primary', className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        buttonStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const control = 'w-full rounded-2xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none ring-green/30 placeholder:text-muted/70 focus:ring-4';

export function Input(props) {
  return <input className={cx(control, props.className)} {...props} />;
}

export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cx(control, 'pr-11', className)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-1 my-auto grid h-9 w-9 place-items-center rounded-xl text-muted hover:text-ink"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" strokeLinecap="round" />
            <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9.3 4.2 10.5 7-0.5 1.2-1.5 2.7-3 4.1M6.1 6.1C4.2 7.4 2.8 9.2 1.5 12c1.2 2.8 5 7 10.5 7 1.4 0 2.7-.3 3.9-.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Select({ children, ...props }) {
  return <select className={cx(control, props.className)} {...props}>{children}</select>;
}

export function TextArea(props) {
  return <textarea className={cx(control, 'min-h-28 resize-y', props.className)} {...props} />;
}

export function Card({ children, className }) {
  return <section className={cx('rounded-3xl border border-line bg-paper p-5 shadow-card', className)}>{children}</section>;
}

const badgeTones = {
  green: 'bg-green-soft text-green-dark',
  gold: 'bg-gold-soft text-amber-900',
  clay: 'bg-clay-soft text-clay',
  ink: 'bg-ink/5 text-ink',
};

export function Badge({ children, tone = 'green' }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', badgeTones[tone])}>{children}</span>;
}

export function Avatar({ name, className }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const tones = ['bg-green-dark text-sand', 'bg-clay text-white', 'bg-ink text-sand', 'bg-gold text-ink'];
  const tone = tones[(name || '').length % tones.length];
  return <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold', tone, className)} aria-hidden="true">{initials}</span>;
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-green border-t-transparent" />
      {label}
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white/70 px-6 py-10 text-center">
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      {text ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Alert({ children, tone = 'clay' }) {
  const tones = { clay: 'bg-clay-soft text-clay', green: 'bg-green-soft text-green-dark' };
  return <p role="alert" className={cx('rounded-2xl px-4 py-3 text-sm', tones[tone])}>{children}</p>;
}

export function Modal({ title, children, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-paper p-5 shadow-card" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" className="rounded-full px-3 py-1 text-sm font-semibold" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? '#F3EEE4' : '#06261D'} />
        <circle cx="32" cy="32" r="15" fill="none" stroke="#C8922A" strokeWidth="3" />
        <path d="M32 17v30M17 32h30M21 23c8 4 14 4 22 0M21 41c8-4 14-4 22 0" fill="none" stroke={light ? '#06261D' : '#F3EEE4'} strokeWidth="2" />
      </svg>
      <span className={cx('leading-tight', light ? 'text-sand' : 'text-ink')}>
        <span className="block font-display text-lg font-semibold tracking-tight">SportsConnect</span>
        <span className={cx('block text-[11px] font-semibold uppercase tracking-[0.16em]', light ? 'text-sand/70' : 'text-muted')}>Garissa</span>
      </span>
    </span>
  );
}

export function AthleteCard({ athlete }) {
  return (
    <Link to={`/athletes/${athlete.id}`} className="flex gap-4 rounded-3xl border border-line bg-paper p-4 shadow-card transition hover:-translate-y-0.5">
      <Avatar name={athlete.name} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{athlete.name}</span>
          {athlete.isMinor ? <Badge tone="gold">Under 18</Badge> : null}
        </span>
        <span className="mt-1 block text-sm text-muted">{sportName(athlete.sport)}{athlete.position ? ` · ${athlete.position}` : ''}</span>
        <span className="mt-1 block text-sm">{athlete.subCounty || 'Garissa County'}</span>
        {athlete.skills?.length ? (
          <span className="mt-2 flex flex-wrap gap-1">
            {athlete.skills.slice(0, 3).map((skill) => <Badge key={skill} tone="ink">{skill}</Badge>)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function StandingsTable({ rows }) {
  if (!rows?.length) return <Empty title="No table yet" text="Standings appear after approved teams and completed matches." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted">
          <tr>
            {['#', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map((heading) => (
              <th key={heading} className="px-2 py-2 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team.id} className="border-t border-line">
              <td className="px-2 py-3">{index + 1}</td>
              <td className="px-2 py-3 font-semibold">{row.team.name}</td>
              <td className="px-2 py-3">{row.played}</td>
              <td className="px-2 py-3">{row.won}</td>
              <td className="px-2 py-3">{row.drawn}</td>
              <td className="px-2 py-3">{row.lost}</td>
              <td className="px-2 py-3">{row.goalsFor}</td>
              <td className="px-2 py-3">{row.goalsAgainst}</td>
              <td className="px-2 py-3">{row.goalDifference}</td>
              <td className="px-2 py-3 font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }) {
  const tone = {
    verified: 'green', approved: 'green', accepted: 'green', completed: 'green', published: 'green', present: 'green',
    pending: 'gold', open: 'gold', ongoing: 'gold', reviewing: 'gold', submitted: 'gold', scheduled: 'gold', late: 'gold',
    rejected: 'clay', suspended: 'clay', closed: 'clay', absent: 'clay', dismissed: 'ink', draft: 'ink', private: 'ink',
  }[status] || 'ink';
  return <Badge tone={tone}>{status}</Badge>;
}

let toastId = 0;
const listeners = new Set();
export function pushToast(message, tone = 'green') {
  const item = { id: ++toastId, message, tone };
  listeners.forEach((listener) => listener(item));
}

export function ToastViewport() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const listener = (item) => {
      setToasts((current) => [...current, item]);
      setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== item.id)), 3600);
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className={cx('pointer-events-auto rounded-2xl px-4 py-3 text-sm font-semibold shadow-card', toast.tone === 'clay' ? 'bg-clay text-white' : 'bg-green-dark text-sand')}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
