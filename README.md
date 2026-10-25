# OPD Saathi AI — Final Submission Build

**Important:** Run `npm.cmd install` and `npm.cmd run dev` from this folder — the same folder that contains `package.json`. **No API keys are required for the core hackathon demo.** Patient/staff login, queue, maps, verified hospitals, emergency help and Saathi demo answers all work without `.env.local`.

OPD Saathi is a patient-first hospital journey platform built for the hackathon: discover suitable nearby hospitals, navigate to them with live GPS, continue into indoor wayfinding where verified data exists, manage OPD tokens, and ask a multilingual AI assistant for hospital and health-literacy help.

## Final feature set

### Patient experience
- Premium responsive landing, signup and sign-in experience
- **Guaranteed one-tap Patient and Staff demo login with zero keys**
- Optional real Google Sign-In when a Google OAuth Client ID is configured
- Patient dashboard with token, queue status, navigation shortcuts and AI access
- Smart OPD registration and synthetic token queue
- English / Hindi / Kannada AI response selection
- Browser speech output for route directions
- Large-text accessibility mode and accessible-route preference

### 3D indoor navigation
- High-fidelity interactive **3D-style hospital navigator** for the fictional hackathon hospital
- Rotate left/right, zoom, floor view and stacked-building view
- Four floors, clickable departments, room codes, lift core and animated route
- Destination glow, entrance marker and accessible-route status
- Switch between 3D navigator and detailed 2D floor plan
- The demo map is explicitly labelled simulated/not-to-scale

### Real-world hospital discovery
- Browser geolocation with live position updates
- Nearby hospital discovery using public OpenStreetMap/Overpass data
- India text search through OpenStreetMap/Nominatim when Google Places is not configured
- **Bengaluru demo location** button if GPS permission is denied or unavailable
- Care matching for Nearest, Emergency, ENT, Surgery, Cardiac, Pediatrics, Maternity, Orthopedics and Trauma
- Evidence-aware ranking: distance plus verified/mapped specialty or emergency data
- Real road route, distance and ETA through OSRM/OpenStreetMap routing
- Google Maps handoff for external turn-by-turn navigation
- Arrival handoff from road navigation to indoor-data checking
- Public indoor/building geometry lookup when such data is genuinely mapped
- No fabricated real-hospital floor plans: missing indoor data is shown as unavailable

### Staff workspace
- Separate staff command center
- Queue overview, waiting patients and call-next controls
- Demo reset for reliable judging/presentation
- `staff@opdsaathi.demo` is the default demo staff account

### AI
- **Zero-key Saathi demo assistant** for navigation, OPD guidance and common health-literacy questions
- Server-side OpenAI endpoint as an optional upgrade
- Open-ended Saathi chat when `OPENAI_API_KEY` is configured
- Automatic fallback to demo answers if the AI provider is not configured or temporarily fails
- Emergency guardrails: the assistant is not a diagnosis or emergency-dispatch service

## 1. Run on Windows / VS Code

Extract the ZIP and open the project folder in VS Code.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

Run source checks:

```powershell
npm.cmd run check
```

Production build:

```powershell
npm.cmd run build
npm.cmd start
```

## 2. Environment variables — OPTIONAL

You can skip this section for the hackathon demo. Create `.env.local` only for optional AI/Google upgrades:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-6-luna
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
NEXT_PUBLIC_STAFF_EMAILS=staff@opdsaathi.demo
```

Restart `npm.cmd run dev` after editing `.env.local`.

## 3. Enable Google signup / sign-in

OPD Saathi uses Google Identity Services. The browser obtains a Google ID credential and sends it to `/api/auth/google`; the server verifies that credential with Google and checks that it was issued for this app's Client ID.

1. Open Google Cloud Console.
2. Configure the OAuth consent screen for your project.
3. Create **OAuth Client ID → Web application**.
4. Add these Authorized JavaScript origins while developing:
   - `http://localhost:3000`
5. After Vercel gives you the final URL, add:
   - `https://YOUR-PROJECT.vercel.app`
6. Copy the Web Client ID into both Google environment variables above.
7. If the OAuth app is still in testing mode, add the Google accounts you will use during judging as test users.

The Google button automatically handles first-time account creation and returning-user sign-in.

**Important:** staff routing in this hackathon prototype is intentionally lightweight. A production hospital system must enforce staff roles on the server/database with proper authorization, not a public email allow-list.

## 4. Demo logins

Patient fallback:

```text
patient@example.com
```

Staff fallback:

```text
staff@opdsaathi.demo
```

A real Google account signs into the patient workspace unless its email is listed in `NEXT_PUBLIC_STAFF_EMAILS`.

## 5. Enable real Saathi AI

Add your OpenAI key only to `.env.local` locally or Vercel Environment Variables in production.

Never put the key in `page.tsx`, browser code or GitHub.

Without an OpenAI key, Saathi automatically runs in **Zero-key demo** mode and still answers the built-in hospital/navigation/health-literacy demo questions.

## 6. Deploy to Vercel

### GitHub + Vercel
1. Push this project to a GitHub repository.
2. In Vercel choose **Add New → Project**.
3. Import the GitHub repository.
4. Vercel should detect **Next.js** automatically. Keep the default build command (`next build`).
5. Add the environment variables from `.env.example` under **Project Settings → Environment Variables**.
6. Deploy.
7. Copy the final `https://...vercel.app` URL.
8. Add that exact origin to the Google OAuth client's **Authorized JavaScript origins** and redeploy/retest Google sign-in.

Vercel provides HTTPS, which is required for browser live geolocation in production.

## 7. Real data used

- Browser Geolocation API: live user position after permission
- OpenStreetMap + Overpass API: hospital locations, mapped capabilities and public indoor/building geometry
- OSRM: road-network routes, distance and ETA
- OpenStreetMap tiles: map display
- Google Maps URL: optional external navigation handoff
- Google Identity Services: Google account sign-in

Public mapping data can be incomplete. Unknown capability data is presented as unknown instead of being invented.

## 8. Indoor-map truthfulness

The 3D/2D four-floor hospital inside the main demo is fictional and clearly labelled as such. For a real selected hospital, OPD Saathi only displays real indoor/building geometry if public verified mapping data is available. If not, it says that an indoor map is unavailable. Hospitals can later supply authoritative CAD/SVG/GeoJSON/floor-plan data to enable full room-level routing.

## 9. Suggested 2-minute submission video flow

1. **0:00–0:15 — Problem + login:** Show the premium landing page and say OPD Saathi connects the entire patient journey. Use Google Sign-In or the demo patient button.
2. **0:15–0:45 — Real hospital discovery:** Open **Best hospital nearby → ENT/Emergency**, allow GPS, and show real hospitals, evidence labels, route/ETA, and the verified-map rule.
3. **0:45–1:10 — Indoor navigation:** Open **Find a department**, show the 3D navigator, switch floors, select Cardiology and show the animated route plus accessibility/safety markers.
4. **1:10–1:30 — AI:** Ask one short multilingual question such as “What does an ECG measure? Explain simply.”
5. **1:30–1:48 — Queue:** Generate a token and show estimated wait.
6. **1:48–2:00 — Staff + close:** Switch to `staff@opdsaathi.demo`, call the next token, and close with: **current location → right hospital → right room → right queue → AI assistance.**

## Emergency help on laptop

The patient workspace has a persistent emergency-help action. It shows **112** (India integrated emergency services), **102** (National Ambulance Service), and **108 Arogya Kavacha** for Karnataka, with copy/open-calling-app controls and a shortcut to the nearest-emergency-hospital screen. The app does not claim to be an emergency dispatch system.

## Prototype / safety note

This is a hackathon prototype, not a medical device or hospital production system. Queue records and demo hospital data are synthetic. Care matching is discovery/navigation support, not diagnosis. For severe or life-threatening symptoms, users should contact local emergency services or seek an appropriate emergency department immediately.

## Google hospital map mode

OPD Saathi can dynamically discover real hospitals anywhere the user is located in India using **Google Places API (New)** and show the result/route in **Google Maps Embed**.

Add these environment variables:

```env
GOOGLE_MAPS_API_KEY=YOUR_SERVER_SIDE_GOOGLE_MAPS_KEY
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=YOUR_BROWSER_RESTRICTED_EMBED_KEY
```

Enable these APIs in the same Google Cloud project:

- Places API (New)
- Maps Embed API

The server key is used only by `/api/nearby-hospitals`. The embed key is intentionally public in the browser and should be locked down by HTTP referrer restrictions to localhost and the deployed OPD Saathi domain.

If these keys are absent or Google Places temporarily fails, the app automatically falls back to the OpenStreetMap/Overpass hospital discovery mode.

### Important real-data rule

OPD Saathi does **not** copy or scrape Google indoor floor plans. Real indoor hospital geometry is rendered only when the hospital supplies it or when a verified/public indoor dataset exposes it. The demo hospital includes clearly labelled simulated safety positions (fire hydrant, fire hose, extinguisher, fire alarm, AED, first aid, emergency exit, assembly point, toilets, accessible toilet, oxygen shutoff and no-smoking signs) so judges can see the full wayfinding concept.

## 10. Verified hospital map library

The app includes a dedicated **Verified Hospitals** sidebar screen with **12 source-linked hospital/institute profiles**. These are labelled by source type—building layout, campus map, master plan, architectural plan, or floor directory—so the UI does not overclaim a directory as an exact floor drawing.

**Tata Memorial Hospital, Mumbai** is the strongest building-layout demo and includes a verified department/building/floor directory from the hospital's own published patient material. The library also includes verified/public sources for major institutes and Bengaluru hospitals. See `VERIFIED_MAPS.md` for every source URL and map type.

For hospitals outside the verified library, OPD Saathi checks public indoor/building geometry. If it cannot verify a real indoor/floor map, the interface explicitly displays **MAP NOT FOUND** instead of inventing one.

See `KEYS_AND_MAP_SETUP.md` for Google/OpenAI key creation and configuration.


## Final submission verification
Before pushing to GitHub, double-click `CHECK_WINDOWS.cmd` or run it from the project root. It now performs the source checks, a real Next.js production build, and zero-key runtime smoke tests. See `QA_REPORT.md` for the verified behaviors.
