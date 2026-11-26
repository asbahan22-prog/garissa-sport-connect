export const SPORTS = [
  { slug: 'football', name: 'Football', summary: 'The game most played in Garissa, from estate pitches to the county stadium.' },
  { slug: 'athletics', name: 'Athletics', summary: 'Sprints and distance running on school tracks and open roads.' },
  { slug: 'volleyball', name: 'Volleyball', summary: 'School and club volleyball across township and sub-county courts.' },
  { slug: 'basketball', name: 'Basketball', summary: 'Indoor and outdoor hoops in Garissa town.' },
  { slug: 'handball', name: 'Handball', summary: 'Fast team handball through schools and county youth games.' },
  { slug: 'netball', name: 'Netball', summary: 'Girls and women’s clubs looking for fixtures, coaches, and trials.' },
];

export const SUB_COUNTIES = ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara', 'Hulugho'];

export const ROLES = [
  { id: 'athlete', title: 'Athlete', text: 'Build a profile, join a squad, and apply for trials.' },
  { id: 'coach', title: 'Coach', text: 'Run teams, training, and attendance.' },
  { id: 'scout', title: 'Scout', text: 'Search talent and keep a shortlist.' },
  { id: 'club_admin', title: 'Club admin', text: 'Register a club and manage its teams.' },
  { id: 'organizer', title: 'Organizer', text: 'Create competitions, fixtures, and results.' },
];

export const METRICS = {
  football: ['goals', 'assists', 'cleanSheets', 'minutes'],
  athletics: ['timeSeconds', 'distanceM'],
  volleyball: ['points', 'aces', 'blocks'],
  basketball: ['points', 'rebounds', 'assists'],
  handball: ['goals', 'assists'],
  netball: ['goals', 'feeds'],
};

export const DEMO_ACCOUNTS = [
  ['Athlete', 'amina@garissa.sport'],
  ['Coach', 'coach@garissa.sport'],
  ['Scout', 'scout@garissa.sport'],
  ['Club', 'club@garissa.sport'],
  ['Organizer', 'organizer@garissa.sport'],
  ['Admin', 'admin@garissa.sport'],
];

export const DEMO_PASSWORD = 'Garissa#2026';

export function sportName(slug) {
  return SPORTS.find((sport) => sport.slug === slug)?.name || (slug ? slug[0].toUpperCase() + slug.slice(1) : 'Sport');
}

export function roleLabel(role) {
  return {
    athlete: 'Athlete',
    coach: 'Coach',
    scout: 'Scout',
    club_admin: 'Club admin',
    organizer: 'Organizer',
    super_admin: 'Super admin',
  }[role] || role;
}
