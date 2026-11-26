# Testing

## Automated

From the project root:

```powershell
npm test
```

`server/src/smoke.test.js` starts a temporary MongoDB and checks:

- the health endpoint
- athletes cannot register without a date of birth
- under-18 athletes cannot register without guardian consent
- a minor profile forced to public is stored as scouts-only and is absent from the public directory
- a scout search still finds that minor
- an athlete cannot open the admin overview
- two coaches can create teams, an organizer can approve them, generate fixtures, and save a score
- the league leader has 3 points and a goal difference of 2
- an athlete can apply once, and a second application is rejected
- logout invalidates the token

## Manual demo

Password for every seeded account: `Garissa#2026`

1. Open the home page and confirm the Garissa County Football League table shows Garissa United on 9 points.
2. Open Athletes and confirm Fatuma Ali and Omar Farah are not listed.
3. Sign in as `amina@garissa.sport`. Edit the profile, open applications, and add a performance record.
4. Sign in as `coach@garissa.sport`. Open Garissa United FC, add a training session, and save attendance.
5. Sign in as `scout@garissa.sport`. Search football, open Fatuma Ali, and confirm the under-18 warning and the shortlist.
6. Sign in as `club@garissa.sport`. Confirm Fafi Netball Club is pending and a verified club can add a team.
7. Sign in as `organizer@garissa.sport`. Open the county league, approve or reject a registration, and save a match score. The table should change.
8. Sign in as `admin@garissa.sport`. Verify or reject Fafi Netball Club, suspend a user, and mark the open report reviewed.
9. Resize the browser to a phone width and confirm the public menu and dashboard menu both open.

## Not covered by automation

Image upload to Cloudinary, HTTPS hosting, and the password-reset email are configuration checks. In development, forgot-password returns the reset link in the response instead of sending email.
