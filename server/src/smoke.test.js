import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-garissa';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.AUTO_SEED = 'false';

let mongo;
let app;

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  const mod = await import('./index.js');
  await mod.connectDB();
  app = mod.app;
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function register(body) {
  return request(app).post('/api/auth/register').send(body);
}

test('health and safeguarding registration', async () => {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.success, true);

  const missingDob = await register({
    name: 'No Date',
    email: 'nodate@example.com',
    password: 'Password123',
    role: 'athlete',
  });
  assert.equal(missingDob.status, 400);

  const minor = await register({
    name: 'Young Player',
    email: 'young@example.com',
    password: 'Password123',
    role: 'athlete',
    dateOfBirth: '2012-01-01',
  });
  assert.equal(minor.status, 400);
  assert.match(minor.body.message, /under 18/i);
});

test('league flow, discovery privacy, and applications', async () => {
  const athlete = await register({
    name: 'Asha Player',
    email: 'asha@example.com',
    password: 'Password123',
    role: 'athlete',
    subCounty: 'Ijara',
    dateOfBirth: '2004-05-01',
  });
  assert.equal(athlete.status, 201);
  const athleteToken = athlete.body.data.token;

  const minor = await register({
    name: 'Minor Player',
    email: 'minor@example.com',
    password: 'Password123',
    role: 'athlete',
    dateOfBirth: '2011-05-01',
    guardian: { name: 'Parent', phone: '0700000000', relationship: 'Mother', consent: true },
  });
  assert.equal(minor.status, 201);

  const saved = await request(app)
    .put('/api/athletes/me')
    .set('Authorization', `Bearer ${minor.body.data.token}`)
    .send({ sport: 'football', position: 'Winger', visibility: 'public', bio: 'Should stay off the public directory' });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.visibility, 'scouts');
  assert.equal(saved.body.data.isMinor, true);

  const coach = await register({ name: 'Coach One', email: 'coach1@example.com', password: 'Password123', role: 'coach' });
  const coachToken = coach.body.data.token;
  const coachTwo = await register({ name: 'Coach Two', email: 'coach2@example.com', password: 'Password123', role: 'coach' });
  const organizer = await register({ name: 'Organizer', email: 'org@example.com', password: 'Password123', role: 'organizer' });
  const scout = await register({ name: 'Scout', email: 'scout1@example.com', password: 'Password123', role: 'scout' });

  await request(app)
    .put('/api/athletes/me')
    .set('Authorization', `Bearer ${athleteToken}`)
    .send({ sport: 'football', position: 'Striker', skills: ['Finishing'], bio: 'Public striker', visibility: 'public' });

  const publicList = await request(app).get('/api/athletes?sport=football');
  assert.equal(publicList.status, 200);
  assert.equal(publicList.body.data.items.some((item) => item.name === 'Asha Player'), true);
  assert.equal(publicList.body.data.items.some((item) => item.name === 'Minor Player'), false);

  const scoutList = await request(app)
    .get('/api/athletes?sport=football')
    .set('Authorization', `Bearer ${scout.body.data.token}`);
  assert.equal(scoutList.body.data.items.some((item) => item.name === 'Minor Player'), true);

  const denied = await request(app).get('/api/admin/overview').set('Authorization', `Bearer ${athleteToken}`);
  assert.equal(denied.status, 403);

  const teamA = await request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${coachToken}`)
    .send({ name: 'Alpha FC', sport: 'football', homeGround: 'Pitch A' });
  const teamB = await request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${coachTwo.body.data.token}`)
    .send({ name: 'Beta FC', sport: 'football' });
  assert.equal(teamA.status, 201);
  assert.equal(teamB.status, 201);

  const added = await request(app)
    .post(`/api/teams/${teamA.body.data._id}/members`)
    .set('Authorization', `Bearer ${coachToken}`)
    .send({ email: 'asha@example.com', jerseyNumber: 9, squadRole: 'captain' });
  assert.equal(added.status, 201);

  const tournament = await request(app)
    .post('/api/tournaments')
    .set('Authorization', `Bearer ${organizer.body.data.token}`)
    .send({ name: 'Test Cup', sport: 'football', format: 'league', location: 'Garissa Stadium', startDate: '2026-11-01' });
  assert.equal(tournament.status, 201);
  const tournamentId = tournament.body.data._id;

  const regA = await request(app)
    .post(`/api/tournaments/${tournamentId}/register`)
    .set('Authorization', `Bearer ${coachToken}`)
    .send({ teamId: teamA.body.data._id });
  const regB = await request(app)
    .post(`/api/tournaments/${tournamentId}/register`)
    .set('Authorization', `Bearer ${coachTwo.body.data.token}`)
    .send({ teamId: teamB.body.data._id });
  assert.equal(regA.status, 201);
  assert.equal(regB.status, 201);

  for (const registration of [regA.body.data, regB.body.data]) {
    const decision = await request(app)
      .patch(`/api/tournaments/${tournamentId}/registrations/${registration.id}`)
      .set('Authorization', `Bearer ${organizer.body.data.token}`)
      .send({ status: 'approved' });
    assert.equal(decision.status, 200);
  }

  const fixtures = await request(app)
    .post(`/api/tournaments/${tournamentId}/fixtures`)
    .set('Authorization', `Bearer ${organizer.body.data.token}`)
    .send({ doubleRound: false });
  assert.equal(fixtures.status, 200);
  assert.ok(fixtures.body.data.created >= 1);

  const detail = await request(app).get(`/api/tournaments/${tournamentId}`);
  const match = detail.body.data.matches[0];
  const scored = await request(app)
    .patch(`/api/matches/${match.id}`)
    .set('Authorization', `Bearer ${organizer.body.data.token}`)
    .send({ homeScore: 2, awayScore: 0, status: 'completed' });
  assert.equal(scored.status, 200);

  const table = await request(app).get(`/api/tournaments/${tournamentId}`);
  const leader = table.body.data.standings[0];
  assert.equal(leader.points, 3);
  assert.equal(leader.goalsFor - leader.goalsAgainst, 2);

  const opportunity = await request(app)
    .post('/api/opportunities')
    .set('Authorization', `Bearer ${organizer.body.data.token}`)
    .send({
      title: 'Trial day',
      type: 'trial',
      sport: 'football',
      description: 'Bring boots.',
      deadline: '2026-12-30',
    });
  assert.equal(opportunity.status, 201);
  const application = await request(app)
    .post(`/api/opportunities/${opportunity.body.data.id}/apply`)
    .set('Authorization', `Bearer ${athleteToken}`)
    .send({ message: 'I would like to attend.' });
  assert.equal(application.status, 201);
  const duplicate = await request(app)
    .post(`/api/opportunities/${opportunity.body.data.id}/apply`)
    .set('Authorization', `Bearer ${athleteToken}`)
    .send({ message: 'Again' });
  assert.equal(duplicate.status, 409);

  const logout = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${athleteToken}`);
  assert.equal(logout.status, 200);
  const reused = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${athleteToken}`);
  assert.equal(reused.status, 401);
});
