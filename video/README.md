# Hireloop — Product Walkthrough Video

`hireloop-demo.mp4` — a lightweight screencast of the Hireloop engineering talent
placement platform running and being used end to end.

**Runtime:** ~64 seconds · **1280×720** · **~740 KB** (no audio, for a small footprint)

## What the video shows

1. **Landing page** — the Hireloop hero with the interactive talent-network visual
2. **Sign in** — logging in to the recruiter workspace as the seeded demo account
3. **Dashboard** — pipeline metrics, placement value, upcoming interviews, activity feed
4. **Candidates** — browsing the candidate directory and filtering by skill search
5. **Candidate detail** — opening a candidate profile with the skill matrix
6. **Placements** — the placement pipeline tracker
7. **Clients** — client accounts and contacts
8. **Interviews** — the interview schedule
9. **Availability** — talent availability matrix
10. **Skills** — skill taxonomy and matrix management
11. **Settings → Audit log** — workspace audit trails
12. **Back to dashboard** — closing out the walkthrough

## Demo account used

| Role | Email | Password |
| :--- | :--- | :--- |
| Recruiter | `demo@arena.dev` | `demo1234` |

## How it was produced

The app was started locally (`npm run dev`), seeded with demo data
(`POST /api/auth/seed`), then driven by a headless-browser script that navigated
and interacted with the UI while continuously capturing the screen. Frames were
encoded to MP4 with ffmpeg at a light bitrate to keep the file small.
