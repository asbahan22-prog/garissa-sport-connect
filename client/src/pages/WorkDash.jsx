import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { SPORTS, sportName } from '../data';
import { useRemote } from '../remote';
import { Alert, Button, Card, Empty, Field, Input, Select, Spinner, StandingsTable, StatusBadge, TextArea, formatDate, formatWhen, pushToast, useTitle } from '../ui';

export function CoachHome() {
  useTitle('Coach dashboard');
  const teams = useRemote('/teams/mine');
  const [form, setForm] = useState({ name: '', sport: 'football', homeGround: '', description: '' });
  async function create(event) {
    event.preventDefault();
    try {
      await api.post('/teams', form);
      setForm({ name: '', sport: 'football', homeGround: '', description: '' });
      teams.reload();
      pushToast('Team created.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Teams</h1>
      <div className="grid gap-3">
        {(teams.data || []).map((team) => (
          <Link key={team.id} to={`/app/teams/${team.id}`} className="rounded-3xl border border-line bg-paper p-4">
            <span className="font-display text-2xl">{team.name}</span>
            <span className="mt-1 block text-sm text-muted">{sportName(team.sport)} · {team.playerCount} players · {team.club?.name || 'Independent team'}</span>
          </Link>
        ))}
        {!teams.loading && !teams.data?.length ? <Empty title="No teams yet" text="Create one, or ask a club administrator to assign you." /> : null}
      </div>
      <Card>
        <h2 className="font-display text-2xl">New team</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Sport"><SportSelect value={form.sport} onChange={(sport) => setForm({ ...form, sport })} /></Field>
          <Field label="Home ground"><Input value={form.homeGround} onChange={(event) => setForm({ ...form, homeGround: event.target.value })} /></Field>
          <div className="flex items-end"><Button type="submit">Create team</Button></div>
        </form>
      </Card>
    </div>
  );
}

export function TeamPage() {
  const { id } = useParams();
  const team = useRemote(`/teams/${id}`);
  const sessions = useRemote(`/teams/${id}/sessions`);
  const summary = useRemote(team.data?.managed ? `/teams/${id}/attendance-summary` : '');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [session, setSession] = useState({ title: '', startsAt: '', location: '' });
  const [attendanceId, setAttendanceId] = useState('');
  const sheet = useRemote(attendanceId ? `/teams/sessions/${attendanceId}/attendance` : '');
  const [marks, setMarks] = useState({});
  useTitle(team.data?.name || 'Team');

  async function addPlayer(event) {
    event.preventDefault();
    try {
      await api.post(`/teams/${id}/members`, { email, jerseyNumber: number, squadRole: 'player' });
      setEmail('');
      setNumber('');
      team.reload();
      pushToast('Player added.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  async function addSession(event) {
    event.preventDefault();
    try {
      await api.post(`/teams/${id}/sessions`, session);
      setSession({ title: '', startsAt: '', location: '' });
      sessions.reload();
      pushToast('Training scheduled.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  async function saveAttendance(event) {
    event.preventDefault();
    const records = (sheet.data?.roster || []).map((player) => ({
      athleteId: player.athleteId,
      status: marks[player.athleteId] || player.status || 'present',
    }));
    try {
      await api.post(`/teams/sessions/${attendanceId}/attendance`, { records });
      summary.reload();
      pushToast('Attendance saved.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  if (team.loading) return <Spinner />;
  if (team.error) return <Alert>{team.error}</Alert>;
  const data = team.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">{data.name}</h1>
        <p className="text-muted">{sportName(data.sport)} · {data.club?.name || 'No club'} · Coach {data.coach?.name || 'unassigned'}</p>
      </div>
      <Card>
        <h2 className="font-display text-2xl">Squad</h2>
        <ul className="mt-3 divide-y divide-line">
          {data.roster.map((player) => (
            <li key={player.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>
                <span className="font-semibold">{player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}</span>
                <span className="text-muted"> · {player.position || player.squadRole}{player.isMinor ? ' · Under 18' : ''}</span>
                {player.guardian?.name ? <span className="block text-xs">Guardian {player.guardian.name} · {player.guardian.phone}</span> : null}
              </span>
              {data.managed ? <Button variant="ghost" onClick={async () => { await api.delete(`/teams/${id}/members/${player.id}`); team.reload(); }}>Remove</Button> : null}
            </li>
          ))}
        </ul>
        {!data.roster.length ? <Empty title="Squad is empty" /> : null}
        {data.managed ? (
          <form onSubmit={addPlayer} className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <Input type="email" required placeholder="Athlete email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Athlete email" />
            <Input placeholder="No." value={number} onChange={(event) => setNumber(event.target.value)} aria-label="Jersey number" />
            <Button type="submit">Add player</Button>
          </form>
        ) : null}
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Training</h2>
        <ul className="mt-3 space-y-2">
          {(sessions.data || []).map((item) => (
            <li key={item._id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{item.title}</span>
              <span className="text-muted">{formatWhen(item.startsAt)} · {item.location}</span>
              {data.managed ? <Button variant="soft" onClick={() => { setAttendanceId(item._id); setMarks({}); }}>Attendance</Button> : null}
            </li>
          ))}
        </ul>
        {data.managed ? (
          <form onSubmit={addSession} className="mt-4 grid gap-3 sm:grid-cols-3">
            <Input required placeholder="Session title" value={session.title} onChange={(event) => setSession({ ...session, title: event.target.value })} aria-label="Session title" />
            <Input required type="datetime-local" value={session.startsAt} onChange={(event) => setSession({ ...session, startsAt: event.target.value })} aria-label="Starts at" />
            <Button type="submit">Schedule</Button>
          </form>
        ) : null}
        {sheet.data ? (
          <form onSubmit={saveAttendance} className="mt-4 space-y-2">
            {sheet.data.roster.map((player) => (
              <label key={player.athleteId} className="flex items-center justify-between gap-3 text-sm">
                <span>{player.name}</span>
                <Select value={marks[player.athleteId] || player.status || 'present'} onChange={(event) => setMarks({ ...marks, [player.athleteId]: event.target.value })} aria-label={`Attendance for ${player.name}`}>
                  {['present', 'late', 'absent', 'excused'].map((status) => <option key={status}>{status}</option>)}
                </Select>
              </label>
            ))}
            <Button type="submit">Save attendance</Button>
          </form>
        ) : null}
        {summary.data ? (
          <div className="mt-4 text-sm">
            <p className="font-semibold">{summary.data.sessions} sessions on record</p>
            <ul className="mt-2 space-y-1">
              {summary.data.players.map((player) => <li key={player.athleteId}>{player.name}: {player.rate === null ? 'no marks' : `${player.rate}% present or late`}</li>)}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function ClubHome() {
  useTitle('Club dashboard');
  const clubs = useRemote('/clubs/mine');
  const [form, setForm] = useState({ name: '', sport: 'football', location: '', subCounty: 'Garissa Township', description: '', contactPhone: '' });
  const [team, setTeam] = useState({ name: '', sport: 'football', clubId: '', coachEmail: '', homeGround: '' });

  async function createClub(event) {
    event.preventDefault();
    try {
      await api.post('/clubs', form);
      clubs.reload();
      pushToast('Club submitted for verification.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  async function createTeam(event) {
    event.preventDefault();
    try {
      await api.post('/teams', team);
      setTeam({ ...team, name: '' });
      pushToast('Team created.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Clubs</h1>
      {(clubs.data || []).map((club) => (
        <Card key={club._id}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">{club.name}</h2>
            <StatusBadge status={club.verificationStatus} />
          </div>
          <p className="mt-2 text-sm text-muted">{club.location} · {club.subCounty}</p>
          {club.verificationNote ? <p className="mt-2 text-sm">{club.verificationNote}</p> : null}
          <Link className="mt-3 inline-block text-sm font-semibold text-green" to={`/clubs/${club._id}`}>Public page</Link>
        </Card>
      ))}
      <Card>
        <h2 className="font-display text-2xl">Register a club</h2>
        <form onSubmit={createClub} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Sport"><SportSelect value={form.sport} onChange={(sport) => setForm({ ...form, sport })} /></Field>
          <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
          <Field label="Phone"><Input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="About"><TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
          <Button type="submit">Submit for verification</Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Add a team</h2>
        <form onSubmit={createTeam} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Club">
            <Select required value={team.clubId} onChange={(event) => setTeam({ ...team, clubId: event.target.value })}>
              <option value="">Choose</option>
              {(clubs.data || []).map((club) => <option key={club._id} value={club._id}>{club.name}</option>)}
            </Select>
          </Field>
          <Field label="Team name"><Input required value={team.name} onChange={(event) => setTeam({ ...team, name: event.target.value })} /></Field>
          <Field label="Sport"><SportSelect value={team.sport} onChange={(sport) => setTeam({ ...team, sport })} /></Field>
          <Field label="Coach email"><Input type="email" placeholder="coach@garissa.sport" value={team.coachEmail} onChange={(event) => setTeam({ ...team, coachEmail: event.target.value })} /></Field>
          <Button type="submit">Create team</Button>
        </form>
      </Card>
    </div>
  );
}

export function OrganizerHome() {
  useTitle('Tournaments');
  const list = useRemote('/tournaments?mine=true');
  const [form, setForm] = useState({ name: '', sport: 'football', location: 'Garissa Stadium', format: 'league', startDate: '', description: '' });
  async function create(event) {
    event.preventDefault();
    try {
      await api.post('/tournaments', form);
      list.reload();
      pushToast('Tournament created.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Tournaments</h1>
      {(list.data?.items || []).map((item) => (
        <Link key={item.id} to={`/app/tournaments/${item.id}`} className="block rounded-3xl border border-line bg-paper p-4">
          <span className="font-display text-2xl">{item.name}</span>
          <span className="mt-1 block text-sm text-muted">{sportName(item.sport)} · {item.status} · {formatDate(item.startDate)}</span>
        </Link>
      ))}
      <Card>
        <h2 className="font-display text-2xl">New competition</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Sport"><SportSelect value={form.sport} onChange={(sport) => setForm({ ...form, sport })} /></Field>
          <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
          <Field label="Format">
            <Select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value })}>
              <option value="league">League</option>
              <option value="knockout">Knockout</option>
            </Select>
          </Field>
          <Field label="Start"><Input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </div>
  );
}

export function ManageTournament() {
  const { id } = useParams();
  const result = useRemote(`/tournaments/${id}`);
  const [scores, setScores] = useState({});
  useTitle(result.data?.name || 'Manage tournament');
  const data = result.data;
  if (result.loading) return <Spinner />;
  if (result.error || !data?.managed) return <Alert>{result.error || 'You do not organize this tournament.'}</Alert>;

  async function decide(registrationId, status) {
    await api.patch(`/tournaments/${id}/registrations/${registrationId}`, { status });
    result.reload();
  }
  async function fixtures() {
    try {
      await api.post(`/tournaments/${id}/fixtures`, { doubleRound: true });
      result.reload();
      pushToast('Fixtures generated.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  async function saveScore(match) {
    const homeScore = Number(scores[match.id]?.home ?? match.homeScore ?? 0);
    const awayScore = Number(scores[match.id]?.away ?? match.awayScore ?? 0);
    try {
      await api.patch(`/matches/${match.id}`, { homeScore, awayScore, status: 'completed' });
      result.reload();
      pushToast('Result saved. The table has been recalculated.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">{data.name}</h1>
        <Link className="text-sm font-semibold text-green" to={`/tournaments/${id}`}>Public page</Link>
      </div>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Registrations</h2>
          {data.format === 'league' ? <Button onClick={fixtures}>Generate league fixtures</Button> : null}
        </div>
        <ul className="mt-3 space-y-2">
          {data.registrations.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{item.team?.name}</span>
              <span className="flex gap-2">
                <StatusBadge status={item.status} />
                {item.status !== 'approved' ? <Button variant="soft" onClick={() => decide(item.id, 'approved')}>Approve</Button> : null}
                {item.status !== 'rejected' ? <Button variant="ghost" onClick={() => decide(item.id, 'rejected')}>Reject</Button> : null}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      {data.format === 'league' ? <Card><h2 className="font-display text-2xl">Standings</h2><StandingsTable rows={data.standings} /></Card> : null}
      <Card>
        <h2 className="font-display text-2xl">Matches</h2>
        <div className="mt-3 space-y-3">
          {data.matches.map((match) => (
            <div key={match.id} className="grid items-center gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_5rem_5rem_auto]">
              <div>
                <p className="font-semibold">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
                <p className="text-xs text-muted">{match.round} · {formatWhen(match.scheduledAt)}</p>
              </div>
              <Input type="number" min="0" aria-label={`${match.homeTeam?.name} score`} defaultValue={match.homeScore ?? ''} onChange={(event) => setScores({ ...scores, [match.id]: { ...scores[match.id], home: event.target.value } })} />
              <Input type="number" min="0" aria-label={`${match.awayTeam?.name} score`} defaultValue={match.awayScore ?? ''} onChange={(event) => setScores({ ...scores, [match.id]: { ...scores[match.id], away: event.target.value } })} />
              <Button onClick={() => saveScore(match)}>Save</Button>
            </div>
          ))}
          {!data.matches.length ? <Empty title="No fixtures yet" /> : null}
        </div>
      </Card>
    </div>
  );
}

export function OpportunityAdmin() {
  useTitle('Opportunities');
  const list = useRemote('/opportunities?mine=true');
  const [form, setForm] = useState({ title: '', type: 'trial', sport: 'football', description: '', location: 'Garissa', deadline: '', organization: '' });
  async function create(event) {
    event.preventDefault();
    try {
      await api.post('/opportunities', form);
      list.reload();
      pushToast('Opportunity published.');
    } catch (err) {
      pushToast(errorMessage(err), 'clay');
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Opportunities</h1>
      {(list.data?.items || []).map((item) => (
        <Link key={item.id} to={`/app/opportunities/${item.id}`} className="block rounded-3xl border border-line bg-paper p-4 font-semibold">{item.title}</Link>
      ))}
      <Card>
        <h2 className="font-display text-2xl">Publish</h2>
        <form onSubmit={create} className="mt-4 grid gap-3">
          <Field label="Title"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                {['trial', 'scholarship', 'recruitment', 'other'].map((type) => <option key={type}>{type}</option>)}
              </Select>
            </Field>
            <Field label="Sport"><SportSelect value={form.sport} onChange={(sport) => setForm({ ...form, sport })} /></Field>
          </div>
          <Field label="Description"><TextArea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <Field label="Deadline"><Input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></Field>
          <Button type="submit">Publish</Button>
        </form>
      </Card>
    </div>
  );
}

export function ReviewApplications() {
  const { id } = useParams();
  const result = useRemote(`/opportunities/${id}/applications`);
  useTitle('Applications');
  if (result.loading) return <Spinner />;
  if (result.error) return <Alert>{result.error}</Alert>;
  async function setStatus(applicationId, status) {
    await api.patch(`/applications/${applicationId}`, { status });
    result.reload();
  }
  return (
    <div className="space-y-3">
      <h1 className="font-display text-4xl">Applications</h1>
      {(result.data || []).map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{item.athlete.name} {item.athlete.isMinor ? '· Under 18' : ''}</p>
              <p className="text-sm text-muted">{item.athlete.email} · {item.message}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['reviewing', 'accepted', 'rejected'].map((status) => (
              <Button key={status} variant="soft" onClick={() => setStatus(item.id, status)}>{status}</Button>
            ))}
          </div>
        </Card>
      ))}
      {!result.data?.length ? <Empty title="No applications yet" /> : null}
    </div>
  );
}

function SportSelect({ value, onChange }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      {SPORTS.map((sport) => <option key={sport.slug} value={sport.slug}>{sport.name}</option>)}
    </Select>
  );
}
