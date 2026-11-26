# Garissa SportsConnect

Connecting talent. Empowering athletes. Transforming sports.

Garissa SportsConnect is a MERN sports management app for Garissa County. Athletes keep a safeguarded profile, clubs manage teams, organizers run leagues, scouts shortlist talent, and a super admin verifies clubs and moderates accounts.

## What works

- Registration, login, logout, and password reset, with role-based dashboards
- Athlete profiles, skills, achievements, photos, and privacy controls
- Guardian consent and a hidden public profile for athletes under 18
- Clubs, verification, teams, squads, training, and attendance
- Tournaments, team registration, round-robin fixtures, scores, and automatic standings
- Athlete search and scout shortlists
- Trials, scholarships, recruitment posts, and application tracking
- Notifications, performance charts, and a platform admin dashboard
- MongoDB persistence

## Tech

React, Tailwind CSS, React Router, Axios, Recharts, Node.js, Express, MongoDB, JWT, and bcrypt. Image uploads go to Cloudinary when those keys are set, and to the API server otherwise.

## Run it locally

Requirements: Node.js 20 or newer.

```powershell
npm run install:all
npm run dev
```

The web app is at http://localhost:5173 and the API at http://localhost:5000.

If `server/.env` has no `MONGO_URI`, the API starts an embedded MongoDB and keeps the data outside OneDrive, in `%LOCALAPPDATA%\garissa-sportsconnect\mongo`. The first launch downloads the MongoDB binary. Set `MONGO_URI` to a MongoDB Atlas connection string for a shared or production database.

An empty local database is filled with demo records on startup. Set `AUTO_SEED=false` to skip that. `npm run seed` resets the database and loads the demo again.

## Demo accounts

Password for every demo account: `Garissa#2026`

| Role | Email |
| --- | --- |
| Athlete | amina@garissa.sport |
| Coach | coach@garissa.sport |
| Scout | scout@garissa.sport |
| Club admin | club@garissa.sport |
| Organizer | organizer@garissa.sport |
| Super admin | admin@garissa.sport |

Two under-18 athlete accounts, `fatuma@garissa.sport` and `omar@garissa.sport`, use the same password. They do not appear in the public directory.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and web app together |
| `npm run seed` | Reset and reload demo data |
| `npm test` | API smoke tests |
| `npm run build` | Production frontend build |

## Deploy

- API: Render, using `render.yaml`. Set `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `SERVER_URL`.
- Web: Vercel, with the project root set to `client`. Set `VITE_API_URL` to `https://your-api.example.com/api`.
- Serve the site over HTTPS. Put secrets in the host’s environment, not in git.

## Docs

- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Hackathon slides](docs/presentation.html)

Open the slides in a browser and use the arrow keys.
# garissa-sport-connect
