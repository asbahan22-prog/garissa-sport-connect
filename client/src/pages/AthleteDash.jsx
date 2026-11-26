import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../api';
import { METRICS, SPORTS, SUB_COUNTIES, sportName } from '../data';
import { useRemote } from '../remote';
import { Alert, Badge, Button, Card, Empty, Field, Input, Select, Spinner, StatusBadge, TextArea, formatDate, pushToast, useTitle } from '../ui';

export function AthleteHome() {
  useTitle('Athlete dashboard');
  const profile = useRemote('/athletes/me');
  const teams = useRemote('/teams/mine');
  const apps = useRemote('/applications/mine');
  const opportunities = useRemote('/opportunities?limit=3');
  if (profile.loading) return <Spinner />;
  const me = profile.data;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green">Athlete</p>
        <h1 className="font-display text-4xl">{me?.name}</h1>
        <p className="mt-2 text-muted">Profile {me?.completion ?? 0}% complete · {me?.visibility} · {me?.isMinor ? 'Under 18 safeguards on' : 'Adult profile'}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted">Sport</p><p className="font-display text-3xl">{sportName(me?.sport) || 'Add a sport'}</p></Card>
        <Card><p className="text-sm text-muted">Teams</p><p className="font-display text-3xl">{teams.data?.length || 0}</p></Card>
        <Card><p className="text-sm text-muted">Applications</p><p className="font-display text-3xl">{apps.data?.length || 0}</p></Card>
      </div>
      <Card>
        <h2 className="font-display text-2xl">My teams</h2>
        <div className="mt-3 space-y-2">
          {(teams.data || []).map((team) => (
            <Link key={team.id} to={`/app/teams/${team.id}`} className="block rounded-2xl border border-line px-3 py-2 font-semibold">{team.name} · {sportName(team.sport)}</Link>
          ))}
          {!teams.data?.length ? <p className="text-sm text-muted">A coach adds you by the email on this account.</p> : null}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Open opportunities</h2>
        <div className="mt-3 space-y-2">
          {(opportunities.data?.items || []).map((item) => <Link key={item.id} className="block font-semibold text-green" to={`/opportunities/${item.id}`}>{item.title}</Link>)}
        </div>
      </Card>
    </div>
  );
}

export function AthleteProfilePage() {
  useTitle('Edit profile');
  const result = useRemote('/athletes/me');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!result.data) return;
    const data = result.data;
    setForm({
      name: data.name || '',
      phone: data.phone || '',
      subCounty: data.subCounty || 'Garissa Township',
      dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
      sport: data.sport || 'football',
      position: data.position || '',
      dominantSide: data.dominantSide || '',
      heightCm: data.heightCm || '',
      weightKg: data.weightKg || '',
      yearsActive: data.yearsActive || '',
      bio: data.bio || '',
      skills: (data.skills || []).join(', '),
      visibility: data.visibility || 'public',
      discoverable: data.discoverable !== false,
      achievements: data.achievements?.length ? data.achievements : [{ title: '', year: '', description: '' }],
      photos: data.photos || [],
      guardian: data.guardian || { name: '', phone: '', relationship: '', consent: false },
    });
  }, [result.data]);

  if (result.loading || !form) return <Spinner />;

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await api.put('/athletes/me', {
        ...form,
        skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
        achievements: form.achievements,
        photos: form.photos,
        guardian: form.guardian,
      });
      pushToast('Profile saved.');
      result.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await api.post('/upload', body);
      set('photos', [...form.photos, { url: res.data.data.url, caption: '', isPublic: !result.data.isMinor }]);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <h1 className="font-display text-4xl">Profile</h1>
      {result.data.isMinor ? <Alert tone="green">Under-18 profiles cannot be fully public. Photos stay off the public site.</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={form.name} onChange={(event) => set('name', event.target.value)} required /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(event) => set('phone', event.target.value)} /></Field>
        <Field label="Sub-county">
          <Select value={form.subCounty} onChange={(event) => set('subCounty', event.target.value)}>
            {SUB_COUNTIES.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Field>
        <Field label="Date of birth"><Input type="date" required value={form.dateOfBirth} onChange={(event) => set('dateOfBirth', event.target.value)} /></Field>
        <Field label="Sport">
          <Select value={form.sport} onChange={(event) => set('sport', event.target.value)}>
            {SPORTS.map((sport) => <option key={sport.slug} value={sport.slug}>{sport.name}</option>)}
          </Select>
        </Field>
        <Field label="Position"><Input value={form.position} onChange={(event) => set('position', event.target.value)} /></Field>
        <Field label="Dominant side"><Input value={form.dominantSide} onChange={(event) => set('dominantSide', event.target.value)} /></Field>
        <Field label="Height (cm)"><Input type="number" value={form.heightCm} onChange={(event) => set('heightCm', event.target.value)} /></Field>
        <Field label="Weight (kg)"><Input type="number" value={form.weightKg} onChange={(event) => set('weightKg', event.target.value)} /></Field>
        <Field label="Years active"><Input type="number" value={form.yearsActive} onChange={(event) => set('yearsActive', event.target.value)} /></Field>
        <Field label="Who can see this">
          <Select value={form.visibility} onChange={(event) => set('visibility', event.target.value)}>
            <option value="public">Public directory</option>
            <option value="scouts">Scouts, coaches, and clubs</option>
            <option value="private">Only me and my team staff</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={form.discoverable} onChange={(event) => set('discoverable', event.target.checked)} />
        Include me in search
      </label>
      <Field label="Bio"><TextArea value={form.bio} onChange={(event) => set('bio', event.target.value)} /></Field>
      <Field label="Skills" hint="Separate with commas."><Input value={form.skills} onChange={(event) => set('skills', event.target.value)} /></Field>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Achievements</h2>
          <Button variant="soft" onClick={() => set('achievements', [...form.achievements, { title: '', year: '', description: '' }])}>Add</Button>
        </div>
        {form.achievements.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <Input placeholder="Title" value={item.title} onChange={(event) => {
              const next = [...form.achievements];
              next[index] = { ...item, title: event.target.value };
              set('achievements', next);
            }} />
            <Input placeholder="Year" value={item.year || ''} onChange={(event) => {
              const next = [...form.achievements];
              next[index] = { ...item, year: event.target.value };
              set('achievements', next);
            }} />
            <Button variant="ghost" onClick={() => set('achievements', form.achievements.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
          </div>
        ))}
      </div>
      {result.data.isMinor ? (
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="font-display text-2xl sm:col-span-2">Guardian</h2>
          <Field label="Name"><Input required value={form.guardian.name || ''} onChange={(event) => set('guardian', { ...form.guardian, name: event.target.value, consent: true })} /></Field>
          <Field label="Phone"><Input required value={form.guardian.phone || ''} onChange={(event) => set('guardian', { ...form.guardian, phone: event.target.value, consent: true })} /></Field>
        </Card>
      ) : null}
      <div>
        <h2 className="font-display text-2xl">Photos</h2>
        <input className="mt-2 block text-sm" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={upload} />
        <ul className="mt-3 space-y-2">
          {form.photos.map((photo, index) => (
            <li key={photo.url} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{photo.url}</span>
              <Button variant="ghost" onClick={() => set('photos', form.photos.filter((_, photoIndex) => photoIndex !== index))}>Remove</Button>
            </li>
          ))}
        </ul>
      </div>
      <Button type="submit">Save profile</Button>
    </form>
  );
}

export function ApplicationsPage() {
  useTitle('Applications');
  const result = useRemote('/applications/mine');
  if (result.loading) return <Spinner />;
  return (
    <div>
      <h1 className="font-display text-4xl">Applications</h1>
      <div className="mt-5 space-y-3">
        {(result.data || []).map((item) => (
          <Card key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <Link to={`/opportunities/${item.opportunity?.id}`} className="font-semibold">{item.opportunity?.title || 'Opportunity'}</Link>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-2 text-sm text-muted">{formatDate(item.createdAt)} · {item.message}</p>
          </Card>
        ))}
        {!result.data?.length ? <Empty title="No applications yet" action={<Link className="font-semibold text-green" to="/opportunities">Browse opportunities</Link>} /> : null}
      </div>
    </div>
  );
}

export function PerformancePage() {
  useTitle('Performance');
  const profile = useRemote('/athletes/me');
  const stats = useRemote('/statistics');
  const [metric, setMetric] = useState('goals');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const suggestions = METRICS[profile.data?.sport] || ['rating', 'minutes'];
  const chart = (stats.data || []).slice().reverse().map((stat) => {
    const found = stat.metrics.find((item) => item.key === metric);
    return found ? { date: formatDate(stat.recordedAt), value: found.value } : null;
  }).filter(Boolean);

  async function add(event) {
    event.preventDefault();
    try {
      await api.post('/statistics', {
        recordedAt: date,
        notes,
        metrics: [{ key: metric, value: Number(value) }],
        sport: profile.data?.sport,
      });
      setValue('');
      setNotes('');
      stats.reload();
      pushToast('Statistic saved.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  if (stats.loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Performance</h1>
      <Card className="h-72">
        {chart.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid stroke="#E3D8C8" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#0C6B4D" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty title={`No ${metric} records yet`} />}
      </Card>
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-4">
        <Field label="Metric">
          <Select value={metric} onChange={(event) => setMetric(event.target.value)}>
            {suggestions.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </Field>
        <Field label="Value"><Input type="number" step="0.01" required value={value} onChange={(event) => setValue(event.target.value)} /></Field>
        <Field label="Date"><Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <div className="flex items-end"><Button type="submit">Add record</Button></div>
        <div className="sm:col-span-4"><Field label="Notes"><Input value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>
      </form>
      <ul className="space-y-2">
        {(stats.data || []).map((stat) => (
          <li key={stat.id} className="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
            <span>{formatDate(stat.recordedAt)} · {stat.metrics.map((item) => `${item.key} ${item.value}`).join(', ')} {stat.notes ? `· ${stat.notes}` : ''}</span>
            <Button variant="ghost" onClick={async () => { await api.delete(`/statistics/${stat.id}`); stats.reload(); }}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BadgeRow({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export { Badge };
