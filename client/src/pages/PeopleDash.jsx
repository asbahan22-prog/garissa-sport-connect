import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth';
import { SPORTS, SUB_COUNTIES, roleLabel, sportName } from '../data';
import { useRemote } from '../remote';
import { Alert, AthleteCard, Button, Card, Empty, Field, Input, Select, Spinner, pushToast, useTitle } from '../ui';

export function ScoutHome() {
  useTitle('Discover athletes');
  const [filters, setFilters] = useState({ q: '', sport: '', subCounty: '', position: '' });
  const [query, setQuery] = useState('?limit=12');
  const result = useRemote(`/athletes${query}`);

  function search(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    setQuery(`?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Discover</h1>
      <form onSubmit={search} className="grid gap-3 sm:grid-cols-4">
        <Input placeholder="Name or skill" aria-label="Search" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
        <Select aria-label="Sport" value={filters.sport} onChange={(event) => setFilters({ ...filters, sport: event.target.value })}>
          <option value="">All sports</option>
          {SPORTS.map((sport) => <option key={sport.slug} value={sport.slug}>{sport.name}</option>)}
        </Select>
        <Select aria-label="Sub-county" value={filters.subCounty} onChange={(event) => setFilters({ ...filters, subCounty: event.target.value })}>
          <option value="">All sub-counties</option>
          {SUB_COUNTIES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Button type="submit">Search</Button>
      </form>
      {result.loading ? <Spinner /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {(result.data?.items || []).map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} />)}
          {!result.data?.items?.length ? <Empty title="No athletes match" text="Try another sport or clear the search." /> : null}
        </div>
      )}
    </div>
  );
}

export function ShortlistPage() {
  useTitle('Shortlist');
  const result = useRemote('/athletes/shortlist');
  if (result.loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Shortlist</h1>
      {(result.data || []).map((athlete) => (
        <div key={athlete.id}>
          <AthleteCard athlete={athlete} />
          {athlete.note ? <p className="px-2 pt-2 text-sm text-muted">{athlete.note}</p> : null}
          {athlete.isMinor ? <p className="px-2 text-sm font-semibold text-clay">Under 18 — contact a guardian or club, not the athlete directly.</p> : null}
        </div>
      ))}
      {!result.data?.length ? <Empty title="Shortlist is empty" text="Save athletes from Discover or a profile." /> : null}
    </div>
  );
}

export function AdminHome() {
  useTitle('Administration');
  const overview = useRemote('/admin/overview');
  const users = useRemote('/admin/users');
  const clubs = useRemote('/admin/clubs?status=pending');
  const reports = useRemote('/admin/reports');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const filtered = useRemote(`/admin/users?q=${encodeURIComponent(q)}&role=${role}`);

  async function updateUser(id, body) {
    try {
      await api.patch(`/admin/users/${id}`, body);
      filtered.reload();
      users.reload();
      pushToast('User updated.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  async function verify(id, status) {
    await api.patch(`/clubs/${id}/verification`, { status, note: status === 'verified' ? 'Documents accepted.' : 'Needs a correction before it can go public.' });
    clubs.reload();
    pushToast(`Club ${status}.`);
  }
  async function closeReport(id, status) {
    await api.patch(`/admin/reports/${id}`, { status });
    reports.reload();
  }

  if (overview.loading) return <Spinner />;
  const totals = overview.data?.totals || {};
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Platform</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(totals).map(([key, value]) => (
          <Card key={key}><p className="font-display text-3xl">{value}</p><p className="text-sm capitalize text-muted">{key}</p></Card>
        ))}
      </div>
      <Card className="h-72">
        <h2 className="font-display text-2xl">Athletes by sport</h2>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={(overview.data?.athletesBySport || []).map((row) => ({ ...row, name: sportName(row.sport) }))}>
            <CartesianGrid stroke="#E3D8C8" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#0C6B4D" radius={8} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Users</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); filtered.reload(); }}>
          <Input placeholder="Name or email" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search users" />
          <Select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Role">
            <option value="">All roles</option>
            {['athlete', 'coach', 'scout', 'club_admin', 'organizer', 'super_admin'].map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
          </Select>
          <Button type="submit">Filter</Button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Name', 'Role', 'Status', ''].map((heading) => <th key={heading} className="py-2">{heading}</th>)}</tr></thead>
            <tbody>
              {(filtered.data || users.data || []).map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="py-2">{user.name}<br /><span className="text-muted">{user.email}</span></td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{user.isSuspended ? 'Suspended' : 'Active'}</td>
                  <td className="py-2 text-right">
                    {user.isSuspended
                      ? <Button variant="soft" onClick={() => updateUser(user.id, { isSuspended: false })}>Restore</Button>
                      : <Button variant="ghost" onClick={() => updateUser(user.id, { isSuspended: true, suspensionReason: 'Suspended by a platform administrator.' })}>Suspend</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Clubs waiting for verification</h2>
        <div className="mt-3 space-y-3">
          {(clubs.data || []).map((club) => (
            <div key={club._id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{club.name}</p>
                <p className="text-sm text-muted">{club.admin?.name} · {club.subCounty}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => verify(club._id, 'verified')}>Verify</Button>
                <Button variant="ghost" onClick={() => verify(club._id, 'rejected')}>Reject</Button>
              </div>
            </div>
          ))}
          {!clubs.data?.length ? <p className="text-sm text-muted">No clubs are waiting.</p> : null}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Reports</h2>
        <ul className="mt-3 space-y-3">
          {(reports.data || []).map((report) => (
            <li key={report._id} className="rounded-2xl border border-line p-3 text-sm">
              <p className="font-semibold">{report.targetType} · {report.status}</p>
              <p className="mt-1">{report.reason}</p>
              <p className="text-muted">From {report.reporter?.name}</p>
              {report.status === 'open' ? (
                <div className="mt-2 flex gap-2">
                  <Button variant="soft" onClick={() => closeReport(report._id, 'reviewed')}>Mark reviewed</Button>
                  <Button variant="ghost" onClick={() => closeReport(report._id, 'dismissed')}>Dismiss</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function NotificationsPage() {
  useTitle('Notifications');
  const result = useRemote('/notifications');
  if (result.loading) return <Spinner />;
  async function read(id) {
    await api.patch(`/notifications/${id}/read`);
    result.reload();
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Notifications</h1>
        <Button variant="soft" onClick={async () => { await api.post('/notifications/read-all'); result.reload(); }}>Mark all read</Button>
      </div>
      {(result.data?.items || []).map((item) => (
        <button key={item.id} type="button" onClick={() => read(item.id)} className={`block w-full rounded-3xl border px-4 py-3 text-left ${item.read ? 'border-line bg-paper' : 'border-green bg-green-soft'}`}>
          <span className="font-semibold">{item.title}</span>
          <span className="mt-1 block text-sm">{item.message}</span>
          {item.link ? <Link to={item.link} className="mt-2 inline-block text-sm font-semibold text-green" onClick={(event) => event.stopPropagation()}>Open</Link> : null}
        </button>
      ))}
      {!result.data?.items?.length ? <Empty title="You are up to date" /> : null}
    </div>
  );
}

export function AccountPage() {
  useTitle('Account');
  const { user, setUser } = useAuth();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const res = await api.put('/auth/me', { phone, name: user.name });
      setUser({ ...user, ...res.data.data });
      pushToast('Account updated.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  async function savePassword(event) {
    event.preventDefault();
    try {
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      localStorage.setItem('gsc_token', res.data.data.token);
      setCurrent('');
      setNext('');
      pushToast('Password changed.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h1 className="font-display text-3xl">Account</h1>
        <p className="mt-2 text-sm text-muted">{user?.email} · {roleLabel(user?.role)}</p>
        <form onSubmit={saveProfile} className="mt-4 space-y-3">
          <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Button type="submit">Save</Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-display text-3xl">Password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-3">
          <Field label="Current password"><Input type="password" required value={currentPassword} onChange={(event) => setCurrent(event.target.value)} /></Field>
          <Field label="New password"><Input type="password" minLength={8} required value={newPassword} onChange={(event) => setNext(event.target.value)} /></Field>
          <Button type="submit">Change password</Button>
        </form>
      </Card>
    </div>
  );
}
