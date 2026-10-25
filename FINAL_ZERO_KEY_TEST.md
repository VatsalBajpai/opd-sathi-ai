# OPD Saathi — Final Zero-Key Test

## No keys required
The core hackathon demo is designed to work with no `.env.local` file.

## Test order
1. Start: `npm.cmd install` then `npm.cmd run check` then `npm.cmd run dev`.
2. Patient: click **Patient** one-tap demo card. No email typing is required.
3. Sidebar: click every patient screen.
4. Find a department: switch 3D/2D, change floors, select Cardiology, toggle accessible route, use Speak route.
5. My visit & token: enter a name, generate token, copy token.
6. Ask Saathi AI: ask `What is an ECG?` — zero-key demo mode must answer.
7. Best hospital nearby: click **Bengaluru demo location** if you do not want to grant GPS permission. Select ENT/Emergency/etc.
8. Verified Hospitals: search and open at least one source-linked profile.
9. Emergency: open the red Emergency button; copy 112/102/108 and open nearest emergency hospital.
10. Switch account -> Staff; click **Call next token** and **Reset demo queue**.

## Optional upgrades
- `OPENAI_API_KEY`: open-ended real AI
- `GOOGLE_MAPS_API_KEY`: Google Places
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`: Google embedded maps
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_ID`: Google sign-in

If optional keys are absent or invalid placeholders, OPD Saathi stays in zero-key demo mode.
