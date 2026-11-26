import path from 'path';
import { fileURLToPath } from 'url';
import {
  AthleteProfile,
  Club,
  Notification,
  TeamMember,
  User,
} from './models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(__dirname, '..');

export const SPORTS = [
  {
    slug: 'football',
    name: 'Football',
    summary: 'The most played game in Garissa, from estate pitches to the county stadium.',
  },
  {
    slug: 'athletics',
    name: 'Athletics',
    summary: 'Distance running and sprints with athletes training on open roads and school tracks.',
  },
  {
    slug: 'volleyball',
    name: 'Volleyball',
    summary: 'School and club volleyball across township courts and sub-county tournaments.',
  },
  {
    slug: 'basketball',
    name: 'Basketball',
    summary: 'Growing indoor and outdoor hoops communities in Garissa town.',
  },
  {
    slug: 'handball',
    name: 'Handball',
    summary: 'Fast team handball introduced through schools and county youth games.',
  },
  {
    slug: 'netball',
    name: 'Netball',
    summary: 'Girls and women’s netball clubs looking for fixtures, coaches, and trials.',
  },
];

export const SUB_COUNTIES = [
  'Garissa Township',
  'Balambala',
  'Lagdera',
  'Dadaab',
  'Fafi',
  'Ijara',
  'Hulugho',
];

export function sportName(slug) {
  return SPORTS.find((sport) => sport.slug === slug)?.name || slug || 'Sport';
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const month = today.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}

export function isMinorDob(dob) {
  const age = ageFromDob(dob);
  return age !== null && age < 18;
}

export function sameId(a, b) {
  if (!a || !b) return false;
  return String(a._id || a) === String(b._id || b);
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function pageQuery(req, fallback = 12) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || fallback));
  return { page, limit, skip: (page - 1) * limit };
}

export function isSafeHttpUrl(url) {
  if (!url) return false;
  if (url.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    county: user.county || 'Garissa',
    subCounty: user.subCounty || '',
    dateOfBirth: user.dateOfBirth || null,
    avatarUrl: user.avatarUrl || '',
    isSuspended: user.isSuspended,
    guardian: user.guardian || {},
    createdAt: user.createdAt,
  };
}

export function profileCompletion(profile, user) {
  const checks = [
    user?.name,
    user?.dateOfBirth,
    user?.subCounty,
    profile?.sport,
    profile?.position,
    profile?.bio,
    profile?.skills?.length,
    profile?.achievements?.length,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function serializeAthlete(profile, level = 'public') {
  const user = profile.user && typeof profile.user === 'object' ? profile.user : null;
  const minor = Boolean(profile.isMinor || isMinorDob(user?.dateOfBirth));
  const privileged = level === 'self' || level === 'admin' || level === 'coach' || level === 'club';
  const scoutView = privileged || level === 'scout';

  const photos = (profile.photos || []).filter((photo) => {
    if (level === 'self' || level === 'admin' || level === 'coach' || level === 'club') return true;
    if (minor) return false;
    return photo.isPublic !== false;
  }).map((photo) => ({
    id: photo._id,
    url: photo.url,
    caption: photo.caption || '',
    isPublic: photo.isPublic !== false,
  }));

  const payload = {
    id: profile._id,
    userId: user?._id || profile.user,
    name: user?.name || 'Athlete',
    sport: profile.sport || '',
    sportName: sportName(profile.sport),
    secondarySports: profile.secondarySports || [],
    position: profile.position || '',
    dominantSide: profile.dominantSide || '',
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    yearsActive: profile.yearsActive ?? null,
    bio: profile.bio || '',
    skills: profile.skills || [],
    achievements: (profile.achievements || []).map((item) => ({
      id: item._id,
      title: item.title,
      year: item.year,
      description: item.description || '',
    })),
    photos,
    visibility: profile.visibility,
    discoverable: profile.discoverable,
    isMinor: minor,
    age: user?.dateOfBirth ? ageFromDob(user.dateOfBirth) : null,
    county: user?.county || 'Garissa',
    subCounty: user?.subCounty || '',
    club: profile.club && typeof profile.club === 'object'
      ? { id: profile.club._id, name: profile.club.name, verificationStatus: profile.club.verificationStatus }
      : profile.club || null,
  };

  if (minor && !privileged) {
    payload.heightCm = null;
    payload.weightKg = null;
  }

  if (privileged) {
    payload.email = user?.email || '';
    payload.phone = user?.phone || '';
    payload.dateOfBirth = user?.dateOfBirth || null;
    payload.completion = profileCompletion(profile, user);
  }

  if (level === 'self' || level === 'admin' || level === 'coach' || level === 'club') {
    if (minor) payload.guardian = user?.guardian || {};
  }

  if (level === 'self' || level === 'admin') {
    payload.completion = profileCompletion(profile, user);
  }

  if (!scoutView && minor) {
    payload.bio = '';
    payload.photos = [];
  }

  return payload;
}

export async function accessLevelForAthlete(viewer, profile) {
  if (!viewer) return 'public';
  const athleteId = profile.user?._id || profile.user;
  if (sameId(viewer._id, athleteId)) return 'self';
  if (viewer.role === 'super_admin') return 'admin';

  const memberships = await TeamMember.find({ athlete: athleteId }).populate({
    path: 'team',
    populate: { path: 'club', select: 'admin' },
  });

  if (viewer.role === 'coach' && memberships.some((member) => sameId(member.team?.coach, viewer._id))) {
    return 'coach';
  }
  if (
    viewer.role === 'club_admin' &&
    memberships.some((member) => sameId(member.team?.club?.admin, viewer._id))
  ) {
    return 'club';
  }
  if (['scout', 'coach', 'club_admin', 'organizer'].includes(viewer.role)) return 'scout';
  return 'public';
}

export function canDiscover(level, profile) {
  if (level === 'self' || level === 'admin' || level === 'coach' || level === 'club') return true;
  if (!profile.discoverable || profile.visibility === 'private') return false;
  if (level === 'public') return profile.visibility === 'public' && !profile.isMinor;
  if (level === 'scout') return profile.visibility === 'public' || profile.visibility === 'scouts';
  return false;
}

export function isTeamManager(user, team) {
  if (!user || !team) return false;
  if (user.role === 'super_admin') return true;
  if (sameId(team.coach, user._id) || sameId(team.coach?._id, user._id)) return true;
  const clubAdmin = team.club?.admin?._id || team.club?.admin;
  if (user.role === 'club_admin' && sameId(clubAdmin, user._id)) return true;
  return false;
}

export function computeStandings(teams, matches) {
  const rows = new Map(
    teams.map((team) => [
      String(team._id),
      {
        team: { id: team._id, name: team.name, sport: team.sport },
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ])
  );

  for (const match of matches) {
    if (match.status !== 'completed' || match.homeScore == null || match.awayScore == null) continue;
    const homeId = String(match.homeTeam?._id || match.homeTeam);
    const awayId = String(match.awayTeam?._id || match.awayTeam);
    const home = rows.get(homeId);
    const away = rows.get(awayId);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;
    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name)
  );
}

/**
 * Circle method for a single round-robin. Odd counts get a bye (null).
 */
export function roundRobin(teamIds) {
  const list = [...teamIds];
  if (list.length < 2) return [];
  if (list.length % 2 === 1) list.push(null);
  const count = list.length;
  const half = count / 2;
  const rounds = [];
  const rotation = [...list];

  for (let round = 0; round < count - 1; round += 1) {
    const pairs = [];
    for (let index = 0; index < half; index += 1) {
      const home = rotation[index];
      const away = rotation[count - 1 - index];
      if (home && away) pairs.push([home, away]);
    }
    rounds.push(pairs);
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop());
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  return rounds;
}

export async function notify(userId, payload) {
  if (!userId) return null;
  return Notification.create({ user: userId, read: false, ...payload });
}

export async function notifyMany(userIds, payload) {
  const ids = [...new Set(userIds.filter(Boolean).map((id) => String(id._id || id)))];
  if (!ids.length) return;
  await Notification.insertMany(ids.map((user) => ({ user, read: false, ...payload })));
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'super_admin', isSuspended: false }).select('_id');
  await notifyMany(admins.map((admin) => admin._id), payload);
}

export async function syncMinorFlag(user) {
  const minor = isMinorDob(user.dateOfBirth);
  const profile = await AthleteProfile.findOne({ user: user._id });
  if (!profile) return null;
  profile.isMinor = minor;
  if (minor && profile.visibility === 'public') profile.visibility = 'scouts';
  await profile.save();
  return profile;
}

export async function clubIfManager(user, clubId) {
  if (!clubId) return null;
  const club = await Club.findById(clubId);
  if (!club) return null;
  if (user.role === 'super_admin' || sameId(club.admin, user._id)) return club;
  return null;
}
