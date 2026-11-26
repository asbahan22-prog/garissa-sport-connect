import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth';
import { SPORTS, SUB_COUNTIES, sportName } from '../data';
import { useRemote } from '../remote';
import { Alert, AthleteCard, Badge, Button, Card, Empty, Field, Input, Select, Spinner, StandingsTable, StatusBadge, TextArea, formatDate, formatWhen, pushToast, useTitle } from '../ui';

export function HomePage() {
  useTitle('');
  const home = useRemote('/home');
  const data = home.data;
  return (
    <div>
      <section className="pitch-grid relative overflow-hidden bg-green-deep text-sand">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">Garissa County, Kenya</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.05] sm:text-6xl">Connecting talent. Empowering athletes. Transforming sports.</h1>
            <p className="mt-5 max-w-lg text-lg text-sand/80">One record for players, clubs, fixtures, trials, and scouts across Garissa — so talent is not lost between a pitch and a phone call.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink">Create an account</Link>
              <Link to="/athletes" className="rounded-full border border-sand/30 px-5 py-3 text-sm font-semibold">Browse athletes</Link>
            </div>
          </div>
          <Card className="bg-paper text-ink">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">County table</p>
            <h2 className="mt-1 font-display text-3xl">{data?.standings?.tournamentName || 'League standings'}</h2>
            {home.loading ? <Spinner /> : <div className="mt-4"><StandingsTable rows={data?.standings?.rows || []} /></div>}
            {data?.standings?.tournamentId ? <Link to={`/tournaments/${data.standings.tournamentId}`} className="mt-4 inline-block text-sm font-semibold text-green">Open the competition</Link> : null}
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-4">
        {[
          ['Athletes', data?.counts?.athletes],
          ['Verified clubs', data?.counts?.clubs],
          ['Competitions', data?.counts?.tournaments],
          ['Open opportunities', data?.counts?.opportunities],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="font-display text-4xl">{home.loading ? '—' : value ?? 0}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Athletes on record</h2>
          <Link to="/athletes" className="text-sm font-semibold text-green">See all</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(data?.athletes || []).map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} />)}
          {!home.loading && !data?.athletes?.length ? <Empty title="No public profiles yet" text="Athlete accounts appear here once a sport is added." /> : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl">Competitions</h2>
          <div className="mt-4 space-y-3">
            {(data?.tournaments || []).map((item) => (
              <Link key={item.id} to={`/tournaments/${item.id}`} className="block rounded-3xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{item.name}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{sportName(item.sport)} · {item.location || 'Garissa'} · {formatDate(item.startDate)}</p>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-display text-4xl">Opportunities</h2>
          <div className="mt-4 space-y-3">
            {(data?.opportunities || []).map((item) => (
              <Link key={item.id} to={`/opportunities/${item.id}`} className="block rounded-3xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{item.title}</h3>
                  <Badge tone="gold">{item.type}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{sportName(item.sport)} · Deadline {formatDate(item.deadline)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-display text-4xl">Sports on the platform</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPORTS.map((sport) => (
            <Link key={sport.slug} to={`/sports/${sport.slug}`} className="rounded-3xl bg-ink p-5 text-sand">
              <h3 className="font-display text-3xl">{sport.name}</h3>
              <p className="mt-2 text-sm text-sand/75">{sport.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AboutPage() {
  useTitle('About');
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green">Why this exists</p>
      <h1 className="mt-2 font-display text-5xl">A county sports record, not another forgotten spreadsheet.</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink/90">
        <p>Garissa has footballers, runners, volleyball players, and coaches doing serious work on township pitches and sub-county grounds. The record of that work is usually a phone, a notebook, or a WhatsApp group.</p>
        <p>SportsConnect gives each role a place: athletes keep a profile, clubs verify their teams, organizers publish fixtures and results, scouts search with clear privacy rules, and administrators can suspend accounts or review a club.</p>
        <p>Athletes under 18 need guardian consent. Their profiles stay out of the public directory, body measurements stay private, and scouts are told to go through a guardian or club.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Athletes', 'Show sport, position, achievements, and applications.'],
          ['Clubs', 'Register, wait for verification, and assign coaches.'],
          ['Organizers', 'Approve teams, generate a league, and enter scores.'],
        ].map(([title, text]) => (
          <Card key={title}><h2 className="font-display text-2xl">{title}</h2><p className="mt-2 text-sm text-muted">{text}</p></Card>
        ))}
      </div>
    </article>
  );
}

export function SportsPage() {
  useTitle('Sports');
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-5xl">Sports</h1>
      <p className="mt-3 max-w-xl text-muted">The catalogue can grow. Each sport uses the same profiles, teams, and competitions.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {SPORTS.map((sport) => (
          <Link key={sport.slug} to={`/sports/${sport.slug}`} className="rounded-3xl border border-line bg-paper p-6">
            <h2 className="font-display text-3xl">{sport.name}</h2>
            <p className="mt-2 text-sm text-muted">{sport.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SportDetailPage() {
  const { slug } = useParams();
  const sport = SPORTS.find((item) => item.slug === slug);
  useTitle(sport?.name || 'Sport');
  const athletes = useRemote(`/athletes?sport=${slug}&limit=6`);
  const tournaments = useRemote(`/tournaments?sport=${slug}&limit=6`);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-5xl">{sport?.name || sportName(slug)}</h1>
      <p className="mt-3 max-w-xl text-muted">{sport?.summary}</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl">Athletes</h2>
          <div className="mt-4 space-y-3">
            {athletes.loading ? <Spinner /> : (athletes.data?.items || []).map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} />)}
            {!athletes.loading && !athletes.data?.items?.length ? <Empty title="No public athletes in this sport yet" /> : null}
          </div>
        </div>
        <div>
          <h2 className="font-display text-3xl">Competitions</h2>
          <div className="mt-4 space-y-3">
            {(tournaments.data?.items || []).map((item) => (
              <Link key={item.id} to={`/tournaments/${item.id}`} className="block rounded-3xl border border-line bg-paper p-4 font-semibold">{item.name}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListingPage({ title, endpoint, render }) {
  useTitle(title);
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const result = useRemote(`${endpoint}${query ? `?${query}` : ''}`);
  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-5xl">{title}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Input placeholder="Search" value={params.get('q') || ''} onChange={(event) => update('q', event.target.value)} aria-label="Search" />
        <Select value={params.get('sport') || ''} onChange={(event) => update('sport', event.target.value)} aria-label="Sport">
          <option value="">All sports</option>
          {SPORTS.map((sport) => <option key={sport.slug} value={sport.slug}>{sport.name}</option>)}
        </Select>
        <Select value={params.get('subCounty') || ''} onChange={(event) => update('subCounty', event.target.value)} aria-label="Sub-county">
          <option value="">All sub-counties</option>
          {SUB_COUNTIES.map((item) => <option key={item}>{item}</option>)}
        </Select>
      </div>
      {result.loading ? <Spinner /> : result.error ? <Alert>{result.error}</Alert> : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(result.data?.items || []).map(render)}
          {!result.data?.items?.length ? <Empty title={`No ${title.toLowerCase()} match that search`} /> : null}
        </div>
      )}
    </div>
  );
}

export function AthletesPage() {
  return (
    <ListingPage
      title="Athletes"
      endpoint="/athletes"
      render={(athlete) => <AthleteCard key={athlete.id} athlete={athlete} />}
    />
  );
}

export function ClubsPage() {
  return (
    <ListingPage
      title="Clubs"
      endpoint="/clubs"
      render={(club) => (
        <Link key={club.id} to={`/clubs/${club.id}`} className="rounded-3xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{club.name}</h2>
            <StatusBadge status={club.verificationStatus} />
          </div>
          <p className="mt-2 text-sm text-muted">{sportName(club.sport)} · {club.subCounty || club.location || 'Garissa'} · {club.teamCount} teams</p>
        </Link>
      )}
    />
  );
}

export function TournamentsPage() {
  return (
    <ListingPage
      title="Tournaments"
      endpoint="/tournaments"
      render={(item) => (
        <Link key={item.id} to={`/tournaments/${item.id}`} className="rounded-3xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{item.name}</h2>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-2 text-sm text-muted">{sportName(item.sport)} · {item.format} · {item.location} · {formatDate(item.startDate)}</p>
        </Link>
      )}
    />
  );
}

export function OpportunitiesPage() {
  return (
    <ListingPage
      title="Opportunities"
      endpoint="/opportunities"
      render={(item) => (
        <Link key={item.id} to={`/opportunities/${item.id}`} className="rounded-3xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{item.title}</h2>
            <Badge tone="gold">{item.type}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{sportName(item.sport)} · {item.organization || item.location} · Deadline {formatDate(item.deadline)}</p>
        </Link>
      )}
    />
  );
}

export function ClubDetailPage() {
  const { id } = useParams();
  const result = useRemote(`/clubs/${id}`);
  const club = result.data;
  useTitle(club?.name || 'Club');
  if (result.loading) return <div className="mx-auto max-w-4xl px-4"><Spinner /></div>;
  if (result.error) return <div className="mx-auto max-w-4xl px-4 py-10"><Alert>{result.error}</Alert></div>;
  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      <StatusBadge status={club.verificationStatus} />
      <h1 className="mt-3 font-display text-5xl">{club.name}</h1>
      <p className="mt-3 text-muted">{club.description}</p>
      <p className="mt-2 text-sm">{sportName(club.sport)} · {club.location} · {club.subCounty}{club.founded ? ` · Founded ${club.founded}` : ''}</p>
      <div className="mt-8 space-y-4">
        {(club.teams || []).map((team) => (
          <Card key={team.id}>
            <h2 className="font-display text-2xl">{team.name}</h2>
            <p className="text-sm text-muted">{sportName(team.sport)} · Coach {team.coach} · {team.homeGround}</p>
            <p className="mt-2 text-sm">{team.players?.length ? team.players.join(', ') : 'Squad list is private or still empty.'}</p>
          </Card>
        ))}
        {!club.teams?.length ? <Empty title="No teams yet" /> : null}
      </div>
    </article>
  );
}

export function TournamentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const result = useRemote(`/tournaments/${id}`);
  const canRegister = ['coach', 'club_admin', 'super_admin'].includes(user?.role);
  const teams = useRemote(canRegister ? '/teams/mine' : '');
  const [teamId, setTeamId] = useState('');
  const [message, setMessage] = useState('');
  const tournament = result.data;
  useTitle(tournament?.name || 'Tournament');

  async function registerTeam(event) {
    event.preventDefault();
    try {
      await api.post(`/tournaments/${id}/register`, { teamId });
      setMessage('Registration submitted. The organizer still has to approve it.');
      result.reload();
    } catch (err) {
      setMessage(errorMessage(err));
    }
  }

  if (result.loading) return <div className="px-4"><Spinner /></div>;
  if (result.error) return <div className="px-4 py-10"><Alert>{result.error}</Alert></div>;

  return (
    <article className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={tournament.status} />
        <Badge tone="ink">{tournament.format}</Badge>
      </div>
      <h1 className="mt-3 font-display text-5xl">{tournament.name}</h1>
      <p className="mt-3 max-w-2xl text-muted">{tournament.description}</p>
      <p className="mt-2 text-sm">{sportName(tournament.sport)} · {tournament.location} · {formatDate(tournament.startDate)} to {formatDate(tournament.endDate)} · Organizer {tournament.organizer}</p>
      {tournament.rules ? <Card className="mt-6"><h2 className="font-semibold">Rules</h2><p className="mt-2 text-sm">{tournament.rules}</p></Card> : null}

      {canRegister && ['open', 'ongoing'].includes(tournament.status) ? (
        <form onSubmit={registerTeam} className="mt-6 flex flex-wrap items-end gap-3">
          <Field label="Register a team you manage">
            <Select value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
              <option value="">Choose a team</option>
              {(teams.data || []).filter((team) => team.sport === tournament.sport).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">Submit</Button>
        </form>
      ) : null}
      {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}

      <h2 className="mt-10 font-display text-3xl">Teams</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {(tournament.registrations || []).map((item) => (
          <span key={item.id} className="rounded-full bg-white px-3 py-1 text-sm font-semibold">{item.team?.name} · {item.status}</span>
        ))}
      </div>

      {tournament.format === 'league' ? (
        <div className="mt-8">
          <h2 className="font-display text-3xl">Standings</h2>
          <Card className="mt-3"><StandingsTable rows={tournament.standings} /></Card>
        </div>
      ) : null}

      <h2 className="mt-8 font-display text-3xl">Fixtures</h2>
      <div className="mt-3 space-y-2">
        {(tournament.matches || []).map((match) => (
          <div key={match.id} className="grid gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm sm:grid-cols-[8rem_1fr_auto]">
            <span className="text-muted">{match.round}<br />{formatWhen(match.scheduledAt)}</span>
            <span className="font-semibold">{match.homeTeam?.name} vs {match.awayTeam?.name}</span>
            <span>{match.status === 'completed' ? `${match.homeScore} – ${match.awayScore}` : match.status}</span>
          </div>
        ))}
        {!tournament.matches?.length ? <Empty title="Fixtures are not published yet" /> : null}
      </div>
    </article>
  );
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const result = useRemote(`/opportunities/${id}`);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const item = result.data;
  useTitle(item?.title || 'Opportunity');

  async function apply(event) {
    event.preventDefault();
    try {
      await api.post(`/opportunities/${id}/apply`, { message });
      pushToast('Application submitted.');
      result.reload();
    } catch (err) {
      setNote(errorMessage(err));
    }
  }

  if (result.loading) return <div className="px-4"><Spinner /></div>;
  if (result.error) return <div className="px-4 py-10"><Alert>{result.error}</Alert></div>;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Badge tone="gold">{item.type}</Badge>
      <h1 className="mt-3 font-display text-5xl">{item.title}</h1>
      <p className="mt-3 whitespace-pre-wrap text-lg">{item.description}</p>
      <p className="mt-4 text-sm text-muted">{sportName(item.sport)} · {item.organization} · {item.location} · Deadline {formatDate(item.deadline)}</p>
      {item.requirements ? <Card className="mt-4"><h2 className="font-semibold">Requirements</h2><p className="mt-2 text-sm">{item.requirements}</p></Card> : null}
      {item.application ? <p className="mt-6 font-semibold">Your application is {item.application.status}.</p> : null}
      {user?.role === 'athlete' && !item.application ? (
        <form onSubmit={apply} className="mt-6 space-y-3">
          {note ? <Alert>{note}</Alert> : null}
          <Field label="Message to the organizer"><TextArea value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
          <Button type="submit">Apply</Button>
        </form>
      ) : null}
      {!user ? <p className="mt-6 text-sm">Athletes can apply after <Link className="font-semibold text-green" to="/login">signing in</Link>.</p> : null}
    </article>
  );
}

export function AthleteDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const result = useRemote(`/athletes/${id}`);
  const stats = useRemote(result.data?.userId ? `/statistics?athleteId=${result.data.userId}` : '');
  const [reason, setReason] = useState('');
  const athlete = result.data;
  useTitle(athlete?.name || 'Athlete');

  async function toggleSave() {
    try {
      if (athlete.saved) await api.delete(`/athletes/${id}/save`);
      else await api.post(`/athletes/${id}/save`, { note: '' });
      result.reload();
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  async function report(event) {
    event.preventDefault();
    try {
      await api.post('/reports', { targetType: 'athlete', targetId: id, reason });
      setReason('');
      pushToast('Report sent to administrators.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  if (result.loading) return <div className="px-4"><Spinner /></div>;
  if (result.error) return <div className="px-4 py-10"><Alert>{result.error}</Alert></div>;

  return (
    <article className="mx-auto max-w-4xl px-4 py-12">
      {athlete.isMinor ? <Alert tone="green">This athlete is under 18. Follow up through a guardian or club. Do not arrange a direct meeting with the athlete.</Alert> : null}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">{athlete.name}</h1>
          <p className="mt-2 text-muted">{athlete.sportName} · {athlete.position || 'Position not set'} · {athlete.subCounty || 'Garissa'}{athlete.age ? ` · Age ${athlete.age}` : ''}</p>
        </div>
        {['scout', 'super_admin'].includes(user?.role) ? <Button variant={athlete.saved ? 'soft' : 'primary'} onClick={toggleSave}>{athlete.saved ? 'Shortlisted' : 'Shortlist'}</Button> : null}
      </div>
      {athlete.bio ? <p className="mt-6 max-w-2xl text-lg">{athlete.bio}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">{(athlete.skills || []).map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Height</p><p className="font-display text-3xl">{athlete.heightCm ? `${athlete.heightCm} cm` : '—'}</p></Card>
        <Card><p className="text-sm text-muted">Side</p><p className="font-display text-3xl">{athlete.dominantSide || '—'}</p></Card>
        <Card><p className="text-sm text-muted">Years active</p><p className="font-display text-3xl">{athlete.yearsActive ?? '—'}</p></Card>
      </div>
      {athlete.guardian?.name ? <Card className="mt-4"><h2 className="font-semibold">Guardian</h2><p className="text-sm">{athlete.guardian.name} · {athlete.guardian.relationship} · {athlete.guardian.phone}</p></Card> : null}
      <h2 className="mt-8 font-display text-3xl">Achievements</h2>
      <ul className="mt-3 space-y-2">
        {(athlete.achievements || []).map((item) => <li key={item.id || item.title} className="rounded-2xl bg-paper px-4 py-3">{item.year ? `${item.year} · ` : ''}{item.title}</li>)}
        {!athlete.achievements?.length ? <Empty title="No achievements listed" /> : null}
      </ul>
      <h2 className="mt-8 font-display text-3xl">Recent numbers</h2>
      {stats.loading ? <Spinner /> : (
        <ul className="mt-3 space-y-2">
          {(stats.data || []).slice(0, 6).map((stat) => (
            <li key={stat.id} className="rounded-2xl border border-line px-4 py-3 text-sm">
              <span className="font-semibold">{formatDate(stat.recordedAt)}</span>
              {' · '}
              {stat.metrics.map((metric) => `${metric.key} ${metric.value}`).join(', ')}
            </li>
          ))}
          {!stats.data?.length ? <Empty title="No statistics shared yet" /> : null}
        </ul>
      )}
      {user ? (
        <form onSubmit={report} className="mt-8 space-y-3">
          <Field label="Report this profile" hint="Administrators review reports. This does not contact the athlete.">
            <TextArea required minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <Button type="submit" variant="ghost">Send report</Button>
        </form>
      ) : null}
    </article>
  );
}

export function ContactPage() {
  useTitle('Contact');
  const [form, setForm] = useState({ name: '', email: '', subject: 'General', message: '' });
  const [note, setNote] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      const res = await api.post('/contact', form);
      setNote(res.data.message);
      setForm({ name: '', email: '', subject: 'General', message: '' });
    } catch (err) {
      setNote(errorMessage(err));
    }
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-5xl">Contact</h1>
      <p className="mt-3 text-muted">Messages go to the platform administrators.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {note ? <Alert tone="green">{note}</Alert> : null}
        <Field label="Name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Email"><Input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Subject"><Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
        <Field label="Message"><TextArea required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field>
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
