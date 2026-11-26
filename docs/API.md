# API

Base URL in development: `http://localhost:5000/api`

Responses use `{ success, data, message }`. Protected routes expect `Authorization: Bearer <token>`. A token lasts 7 days and is rejected after logout, a password change, or suspension.

## Auth

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create an account. Athletes must send a date of birth. Under-18 athletes must send guardian name, phone, and consent. |
| POST | `/auth/login` | Public | Return a token and the user. |
| POST | `/auth/logout` | Signed in | Invalidate the current token. |
| GET | `/auth/me` | Signed in | Current account. |
| PUT | `/auth/me` | Signed in | Update name, phone, county, and sub-county. |
| PUT | `/auth/password` | Signed in | Change password. Body: `currentPassword`, `newPassword`. |
| POST | `/auth/forgot-password` | Public | Create a one-hour reset token. Outside production the response includes `resetUrl`. |
| POST | `/auth/reset-password/:token` | Public | Set a new password and sign in. |

Roles: `athlete`, `coach`, `scout`, `club_admin`, `organizer`, `super_admin`. Self-registration cannot create a super admin.

## Public and shared

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check. |
| GET | `/sports` | Sports catalogue and sub-counties. |
| GET | `/home` | Homepage counts, featured athletes, competitions, opportunities, and a league table. |
| POST | `/contact` | Send a message to super admins. |
| POST | `/upload` | Signed-in image upload. JPG, PNG, WEBP, or GIF, up to 5MB. |
| POST | `/reports` | Report a user, athlete, club, or opportunity. |

## Athletes

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/athletes` | Public or signed in | Search. Query: `q`, `sport`, `position`, `skill`, `subCounty`, `page`, `limit`. Public results hide private profiles and under-18 athletes. Scouts also see profiles marked for scouts. |
| GET | `/athletes/me` | Athlete | Own profile. |
| PUT | `/athletes/me` | Athlete | Update profile, achievements, photos, visibility, and guardian details. |
| GET | `/athletes/shortlist` | Scout | Saved athletes. |
| GET | `/athletes/:id` | Depends on privacy | Profile detail. |
| POST | `/athletes/:id/save` | Scout | Shortlist. Optional `note`. |
| DELETE | `/athletes/:id/save` | Scout | Remove from shortlist. |

Visibility is `public`, `scouts`, or `private`. Under-18 athletes cannot be public. Their photos, phone, email, date of birth, and body measurements are hidden from scouts. Coaches and club admins of that athlete can see guardian contact.

## Clubs and teams

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/clubs` | Public | Verified clubs. |
| GET | `/clubs/mine` | Club admin | Clubs they administer, including pending ones. |
| POST | `/clubs` | Club admin | Submit a club. It stays pending until a super admin verifies it. |
| GET | `/clubs/:id` | Public if verified | Club and teams. |
| PUT | `/clubs/:id` | Owner | Edit the club. |
| PATCH | `/clubs/:id/verification` | Super admin | Body: `status` of `verified`, `rejected`, or `pending`. |
| GET | `/teams/mine` | Coach, club admin, athlete | Teams for the signed-in user. |
| POST | `/teams` | Coach or club admin | Create a team. Club admins must send `clubId`. |
| GET | `/teams/:id` | Public if the club is verified | Squad. Minors are omitted from the public roster. |
| PUT | `/teams/:id` | Manager | Edit the team or assign `coachEmail`. |
| POST | `/teams/:id/members` | Manager | Add an athlete by email. |
| DELETE | `/teams/:id/members/:memberId` | Manager | Remove a player. |
| GET/POST | `/teams/:id/sessions` | Squad / manager | Training schedule. |
| GET/POST | `/teams/sessions/:sessionId/attendance` | Manager | Read or save attendance. Body: `records: [{ athleteId, status }]`. |
| GET | `/teams/:id/attendance-summary` | Manager | Attendance rates. |

## Tournaments and matches

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/tournaments` | Public | Competitions that are not drafts. `mine=true` limits the list to the organizer. |
| POST | `/tournaments` | Organizer | Create a league or knockout. |
| GET | `/tournaments/:id` | Public | Details, registrations, fixtures, and league standings. |
| PUT | `/tournaments/:id` | Organizer | Edit. |
| POST | `/tournaments/:id/register` | Team manager | Body: `teamId`. |
| PATCH | `/tournaments/:id/registrations/:registrationId` | Organizer | Approve or reject. |
| POST | `/tournaments/:id/fixtures` | Organizer | Generate a round-robin for a league. `doubleRound` defaults to true. |
| DELETE | `/tournaments/:id/matches` | Organizer | Remove fixtures. |
| POST | `/tournaments/:id/matches` | Organizer | Add one fixture. |
| PATCH | `/matches/:id` | Organizer | Set the schedule or the score. Completed scores update the table. |

League points are 3 for a win and 1 for a draw. Ties break by goal difference, then goals scored.

## Opportunities, performance, notifications, admin

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/opportunities` | Public / poster | List published posts, or create a trial, scholarship, or recruitment. |
| GET/PUT | `/opportunities/:id` | Public if published | Read or edit. |
| POST | `/opportunities/:id/apply` | Athlete | Apply once. |
| GET | `/opportunities/:id/applications` | Poster | Review applicants. |
| GET | `/applications/mine` | Athlete | Track status. |
| PATCH | `/applications/:id` | Poster | Set `submitted`, `reviewing`, `accepted`, or `rejected`. |
| GET/POST | `/statistics` | Depends on privacy | Performance records. Body metrics are `{ key, value }`. |
| DELETE | `/statistics/:id` | Owner or recorder | Remove a record. |
| GET | `/notifications` | Signed in | Inbox and unread count. |
| PATCH | `/notifications/:id/read` | Signed in | Mark one read. |
| POST | `/notifications/read-all` | Signed in | Mark all read. |
| GET | `/admin/overview` | Super admin | Totals, users by role, athletes by sport. |
| GET/PATCH | `/admin/users` and `/admin/users/:id` | Super admin | Search, suspend, or change a role. |
| GET | `/admin/clubs` | Super admin | Club queue. |
| GET/PATCH | `/admin/reports` and `/admin/reports/:id` | Super admin | Moderation queue. |
