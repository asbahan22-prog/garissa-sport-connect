import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from './db.js';
import { serverRoot } from './paths.js';
import {
  Application,
  AthleteProfile,
  Attendance,
  Club,
  Match,
  Notification,
  Opportunity,
  Registration,
  Report,
  SavedAthlete,
  Statistic,
  Team,
  TeamMember,
  Tournament,
  TrainingSession,
  User,
} from './models.js';

dotenv.config({ path: path.join(serverRoot, '.env') });

const DEMO_PASSWORD = 'Garissa#2026';

export async function seedDatabase() {
  await Promise.all([
    User.deleteMany({}),
    AthleteProfile.deleteMany({}),
    Club.deleteMany({}),
    Team.deleteMany({}),
    TeamMember.deleteMany({}),
    Tournament.deleteMany({}),
    Registration.deleteMany({}),
    Match.deleteMany({}),
    Statistic.deleteMany({}),
    TrainingSession.deleteMany({}),
    Attendance.deleteMany({}),
    Opportunity.deleteMany({}),
    Application.deleteMany({}),
    Notification.deleteMany({}),
    SavedAthlete.deleteMany({}),
    Report.deleteMany({}),
  ]);

  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const account = (data) => ({ ...data, password, county: 'Garissa' });

  const [
    amina, abdi, fatuma, yusuf, halima, hassan, maryan, omar,
    coach, naima, scout, clubAdmin, organizer, admin,
  ] = await User.create([
    account({ name: 'Amina Hassan', email: 'amina@garissa.sport', role: 'athlete', phone: '0712001101', subCounty: 'Garissa Township', dateOfBirth: new Date('2006-04-12') }),
    account({ name: 'Abdi Mohamed', email: 'abdi@garissa.sport', role: 'athlete', phone: '0712001102', subCounty: 'Balambala', dateOfBirth: new Date('2007-01-03') }),
    account({ name: 'Fatuma Ali', email: 'fatuma@garissa.sport', role: 'athlete', phone: '0712001103', subCounty: 'Dadaab', dateOfBirth: new Date('2009-08-19'), guardian: { name: 'Hodan Ali', phone: '0712550190', relationship: 'Mother', consent: true } }),
    account({ name: 'Yusuf Ibrahim', email: 'yusuf@garissa.sport', role: 'athlete', phone: '0712001104', subCounty: 'Ijara', dateOfBirth: new Date('2004-11-02') }),
    account({ name: 'Halima Omar', email: 'halima@garissa.sport', role: 'athlete', phone: '0712001105', subCounty: 'Garissa Township', dateOfBirth: new Date('2005-06-15') }),
    account({ name: 'Hassan Noor', email: 'hassan@garissa.sport', role: 'athlete', phone: '0712001106', subCounty: 'Dadaab', dateOfBirth: new Date('2008-02-28') }),
    account({ name: 'Maryan Aden', email: 'maryan@garissa.sport', role: 'athlete', phone: '0712001107', subCounty: 'Fafi', dateOfBirth: new Date('2003-03-09') }),
    account({ name: 'Omar Farah', email: 'omar@garissa.sport', role: 'athlete', phone: '0712001108', subCounty: 'Garissa Township', dateOfBirth: new Date('2010-09-01'), guardian: { name: 'Farah Hassan', phone: '0712550144', relationship: 'Father', consent: true } }),
    account({ name: 'Abdullahi Warsame', email: 'coach@garissa.sport', role: 'coach', phone: '0712002201', subCounty: 'Garissa Township' }),
    account({ name: 'Naima Ali', email: 'naima@garissa.sport', role: 'coach', phone: '0712002202', subCounty: 'Dadaab' }),
    account({ name: 'James Otieno', email: 'scout@garissa.sport', role: 'scout', phone: '0712003301', subCounty: 'Garissa Township' }),
    account({ name: 'Khadija Mohamed', email: 'club@garissa.sport', role: 'club_admin', phone: '0712004401', subCounty: 'Garissa Township' }),
    account({ name: 'Mohamed Abdullahi', email: 'organizer@garissa.sport', role: 'organizer', phone: '0712005501', subCounty: 'Garissa Township' }),
    account({ name: 'Asha Aden', email: 'admin@garissa.sport', role: 'super_admin', phone: '0712006601', subCounty: 'Garissa Township' }),
  ]);

  const profiles = {
    amina: { user: amina, sport: 'football', position: 'Striker', dominantSide: 'Right', heightCm: 168, weightKg: 60, yearsActive: 8, bio: 'Township striker who leads the line for Garissa United and wants a pathway beyond county football.', skills: ['Finishing', 'Pressing', 'Hold-up play'], achievements: [{ title: 'Garissa County golden boot', year: 2025, description: '18 league goals' }], visibility: 'public', isMinor: false },
    abdi: { user: abdi, sport: 'football', position: 'Goalkeeper', dominantSide: 'Right', heightCm: 186, weightKg: 78, yearsActive: 6, bio: 'Shot-stopper from Balambala with a calm box and a long kick.', skills: ['Shot stopping', 'Distribution', 'Command'], achievements: [{ title: 'Sub-county clean sheets award', year: 2025 }], visibility: 'public', isMinor: false },
    fatuma: { user: fatuma, sport: 'athletics', position: '400m', heightCm: 162, weightKg: 52, yearsActive: 3, bio: 'Dadaab sprinter. Profile is visible to scouts only because she is under 18.', skills: ['Speed', 'Curve running'], achievements: [{ title: 'School games silver', year: 2025, description: '400 metres' }], visibility: 'scouts', isMinor: true, discoverable: true },
    yusuf: { user: yusuf, sport: 'volleyball', position: 'Outside hitter', heightCm: 191, weightKg: 82, yearsActive: 7, bio: 'Ijara hitter looking for a club programme with regular fixtures.', skills: ['Spike', 'Serve receive'], visibility: 'public', isMinor: false },
    halima: { user: halima, sport: 'basketball', position: 'Point guard', heightCm: 170, weightKg: 63, yearsActive: 9, bio: 'Floor general for township basketball. Organises the break and defends the ball.', skills: ['Playmaking', 'Steals', 'Leadership'], visibility: 'public', isMinor: false },
    hassan: { user: hassan, sport: 'football', position: 'Midfielder', dominantSide: 'Left', heightCm: 175, weightKg: 68, yearsActive: 5, bio: 'Box-to-box midfielder for Dadaab Youth. Strong engine and simple passing.', skills: ['Stamina', 'Passing', 'Tackling'], visibility: 'public', isMinor: false },
    maryan: { user: maryan, sport: 'athletics', position: '5000m', heightCm: 164, weightKg: 54, yearsActive: 10, bio: 'Distance runner from Fafi training for county and regional road races.', skills: ['Endurance', 'Race pace'], achievements: [{ title: 'County 5km champion', year: 2024 }], visibility: 'public', isMinor: false },
    omar: { user: omar, sport: 'football', position: 'Winger', dominantSide: 'Left', heightCm: 165, weightKg: 56, yearsActive: 3, bio: 'Under-18 winger. Guardian consent is on file and the public directory hides this profile.', skills: ['Dribbling', 'Pace'], visibility: 'scouts', isMinor: true },
  };

  const createdProfiles = await AthleteProfile.create(Object.values(profiles));
  const profileByUser = new Map(createdProfiles.map((profile) => [String(profile.user), profile]));

  const [unitedClub, dadaabClub, fafiClub] = await Club.create([
    { name: 'Garissa United Sports Club', description: 'Township club running football and community sport at Garissa Stadium.', sport: 'multi', location: 'Garissa Stadium', subCounty: 'Garissa Township', founded: 2014, contactEmail: 'club@garissa.sport', contactPhone: '0712004401', admin: clubAdmin._id, verificationStatus: 'verified' },
    { name: 'Dadaab Youth Sports', description: 'Youth football club giving Dadaab players a fixture list and a coach.', sport: 'football', location: 'Dadaab Sports Field', subCounty: 'Dadaab', founded: 2018, contactEmail: 'naima@garissa.sport', contactPhone: '0712002202', admin: clubAdmin._id, verificationStatus: 'verified' },
    { name: 'Fafi Netball Club', description: 'New netball club waiting for document checks before it appears publicly.', sport: 'netball', location: 'Bura Social Hall', subCounty: 'Fafi', founded: 2026, contactEmail: 'club@garissa.sport', contactPhone: '0712004401', admin: clubAdmin._id, verificationStatus: 'pending', verificationNote: '' },
  ]);

  const [united, township, dadaab] = await Team.create([
    { name: 'Garissa United FC', club: unitedClub._id, sport: 'football', coach: coach._id, description: 'Senior township side.', homeGround: 'Garissa Stadium', createdBy: clubAdmin._id },
    { name: 'Township FC', club: unitedClub._id, sport: 'football', coach: coach._id, description: 'Development side with under-18 players.', homeGround: 'Garissa Stadium outer pitch', createdBy: clubAdmin._id },
    { name: 'Dadaab Youth FC', club: dadaabClub._id, sport: 'football', coach: naima._id, description: 'Dadaab youth football team.', homeGround: 'Dadaab Sports Field', createdBy: clubAdmin._id },
  ]);

  await AthleteProfile.updateMany({ user: { $in: [amina._id, abdi._id, omar._id] } }, { club: unitedClub._id });
  await AthleteProfile.updateOne({ user: hassan._id }, { club: dadaabClub._id });

  await TeamMember.create([
    { team: united._id, athlete: amina._id, jerseyNumber: 9, squadRole: 'captain' },
    { team: united._id, athlete: abdi._id, jerseyNumber: 1, squadRole: 'player' },
    { team: township._id, athlete: omar._id, jerseyNumber: 7, squadRole: 'player' },
    { team: dadaab._id, athlete: hassan._id, jerseyNumber: 8, squadRole: 'captain' },
  ]);

  const league = await Tournament.create({
    name: 'Garissa County Football League 2026',
    sport: 'football',
    organizer: organizer._id,
    description: 'County league for township and sub-county clubs. Three points for a win.',
    rules: 'League format. Win 3, draw 1. Goal difference, then goals scored, breaks ties.',
    location: 'Garissa Stadium',
    startDate: new Date('2026-10-04T15:00:00+03:00'),
    endDate: new Date('2026-12-13T17:00:00+03:00'),
    format: 'league',
    status: 'ongoing',
    maxTeams: 12,
  });

  await Registration.create([
    { tournament: league._id, team: united._id, status: 'approved' },
    { tournament: league._id, team: township._id, status: 'approved' },
    { tournament: league._id, team: dadaab._id, status: 'approved' },
  ]);

  await Match.create([
    { tournament: league._id, homeTeam: united._id, awayTeam: township._id, scheduledAt: new Date('2026-10-04T15:00:00+03:00'), venue: 'Garissa Stadium', round: 'Round 1', homeScore: 2, awayScore: 1, status: 'completed', recordedBy: organizer._id },
    { tournament: league._id, homeTeam: dadaab._id, awayTeam: united._id, scheduledAt: new Date('2026-10-11T15:00:00+03:00'), venue: 'Dadaab Sports Field', round: 'Round 2', homeScore: 0, awayScore: 2, status: 'completed', recordedBy: organizer._id },
    { tournament: league._id, homeTeam: township._id, awayTeam: dadaab._id, scheduledAt: new Date('2026-10-18T15:00:00+03:00'), venue: 'Garissa Stadium', round: 'Round 3', homeScore: 1, awayScore: 3, status: 'completed', recordedBy: organizer._id },
    { tournament: league._id, homeTeam: township._id, awayTeam: united._id, scheduledAt: new Date('2026-10-25T15:00:00+03:00'), venue: 'Garissa Stadium', round: 'Round 4', homeScore: 0, awayScore: 1, status: 'completed', recordedBy: organizer._id },
    { tournament: league._id, homeTeam: united._id, awayTeam: dadaab._id, scheduledAt: new Date('2026-11-29T15:00:00+03:00'), venue: 'Garissa Stadium', round: 'Round 5', status: 'scheduled' },
    { tournament: league._id, homeTeam: dadaab._id, awayTeam: township._id, scheduledAt: new Date('2026-12-06T15:00:00+03:00'), venue: 'Dadaab Sports Field', round: 'Round 6', status: 'scheduled' },
  ]);

  const pastSession = await TrainingSession.create({
    team: united._id,
    coach: coach._id,
    title: 'Finishing and pressing',
    startsAt: new Date('2026-11-18T16:30:00+03:00'),
    location: 'Garissa Stadium',
    notes: 'Struck from the edge of the box, then a 20-minute pressing drill.',
  });
  await TrainingSession.create({
    team: united._id,
    coach: coach._id,
    title: 'Match preview shape',
    startsAt: new Date('2026-11-27T16:30:00+03:00'),
    location: 'Garissa Stadium',
    notes: 'Prepare the mid-block for Dadaab Youth.',
  });
  await Attendance.create([
    { session: pastSession._id, athlete: amina._id, status: 'present' },
    { session: pastSession._id, athlete: abdi._id, status: 'late' },
  ]);

  await Statistic.create([
    { athlete: amina._id, recordedBy: coach._id, sport: 'football', recordedAt: new Date('2026-10-04'), metrics: [{ key: 'goals', value: 2 }, { key: 'assists', value: 0 }], notes: 'County league, Township FC' },
    { athlete: amina._id, recordedBy: coach._id, sport: 'football', recordedAt: new Date('2026-10-11'), metrics: [{ key: 'goals', value: 1 }, { key: 'assists', value: 1 }], notes: 'County league, Dadaab Youth' },
    { athlete: amina._id, recordedBy: coach._id, sport: 'football', recordedAt: new Date('2026-10-25'), metrics: [{ key: 'goals', value: 1 }, { key: 'assists', value: 0 }], notes: 'County league, Township FC' },
    { athlete: hassan._id, recordedBy: naima._id, sport: 'football', recordedAt: new Date('2026-10-18'), metrics: [{ key: 'goals', value: 2 }, { key: 'assists', value: 0 }], notes: 'Winner against Township' },
    { athlete: maryan._id, recordedBy: maryan._id, sport: 'athletics', recordedAt: new Date('2026-09-12'), metrics: [{ key: 'timeSeconds', value: 1042 }], notes: 'Fafi road 5km' },
  ]);

  const [trials, scholarship, recruitment] = await Opportunity.create([
    { title: 'Garissa United open trials', type: 'trial', sport: 'football', description: 'Open trials for township players born in 2004 or later. Bring boots, identification, and arrive ready to train.', requirements: 'Football profile, available on Saturday mornings.', organization: 'Garissa United Sports Club', location: 'Garissa Stadium', deadline: new Date('2026-12-20'), postedBy: clubAdmin._id, status: 'published' },
    { title: 'County athletics support grant', type: 'scholarship', sport: 'athletics', description: 'Small grant for athletes who need travel and kit support for the regional championships.', requirements: 'Athletics profile and one recorded performance.', organization: 'Garissa County Sports Office', location: 'Garissa', deadline: new Date('2027-01-15'), postedBy: organizer._id, status: 'published' },
    { title: 'Scout weekend: attacking players', type: 'recruitment', sport: 'football', description: 'A scout visit focused on strikers and wingers who can be invited to a regional assessment.', requirements: 'Discoverable football profile.', organization: 'Independent scouting visit', location: 'Garissa Stadium', deadline: new Date('2026-12-05'), postedBy: scout._id, status: 'published' },
  ]);

  await Application.create([
    { opportunity: trials._id, athlete: amina._id, message: 'I captain Garissa United and would like to be considered for the senior pathway.', status: 'reviewing' },
    { opportunity: scholarship._id, athlete: maryan._id, message: 'Requesting support for travel to the regional 5km.', status: 'submitted' },
  ]);

  await SavedAthlete.create([
    { scout: scout._id, athlete: amina._id, note: 'Leads the line. Watch the 29 Nov fixture.' },
    { scout: scout._id, athlete: fatuma._id, note: 'Under 18. Contact the guardian, not the athlete, if we follow up.' },
  ]);

  await Report.create({
    reporter: scout._id,
    targetType: 'club',
    targetId: fafiClub._id,
    reason: 'Please confirm the Fafi Netball Club contact details before verification.',
    status: 'open',
  });

  const note = (user, title, message, type, link) => ({ user: user._id, title, message, type, link, read: false });
  await Notification.create([
    note(amina, 'Application in review', 'Garissa United open trials is now being reviewed.', 'application', '/app/athlete/applications'),
    note(amina, 'Training on Friday', 'Match preview shape at Garissa Stadium.', 'training', '/app/athlete'),
    note(coach, 'Fixtures published', 'Garissa County Football League 2026 is underway.', 'match', `/tournaments/${league._id}`),
    note(clubAdmin, 'Club awaiting verification', 'Fafi Netball Club is still pending review.', 'club', '/app/club'),
    note(organizer, 'Result recorded', 'Township FC 0–1 Garissa United FC', 'match', `/tournaments/${league._id}`),
    note(scout, 'Shortlist ready', 'Amina Hassan and Fatuma Ali are on your shortlist.', 'scout', '/app/scout'),
    note(admin, 'Open report', 'A club verification check was reported.', 'report', '/app/admin'),
    note(fatuma, 'Profile safeguarded', 'Because you are under 18, your profile is hidden from the public directory.', 'privacy', '/app/athlete/profile'),
  ]);

  return {
    password: DEMO_PASSWORD,
    users: { amina, coach, scout, clubAdmin, organizer, admin },
    leagueId: league._id,
    profiles: profileByUser,
    clubs: { unitedClub, dadaabClub, fafiClub },
    opportunities: { trials, scholarship, recruitment },
  };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
const self = path.resolve(fileURLToPath(import.meta.url));
if (invoked === self) {
  if (!process.argv.includes('--yes')) {
    console.error('This resets Garissa SportsConnect data. Run: npm run seed');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'seed-only';
  connectDB()
    .then(() => seedDatabase())
    .then(() => {
      console.log(`Demo data ready. Password for every demo account: ${DEMO_PASSWORD}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectDB();
      process.exit(process.exitCode || 0);
    });
}
