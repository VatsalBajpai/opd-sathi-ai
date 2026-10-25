# OPD Saathi — Zero-Key Demo

The core hackathon flow requires **no API keys**.

## Guaranteed demo logins

- Patient: `patient@example.com`
- Staff: `staff@opdsaathi.demo`
- Or click the one-tap Patient / Staff cards on the login screen.

## Works without keys

- Patient and staff login
- Patient dashboard
- OPD token generation
- Staff call-next queue controls
- 2D + 3D demo hospital navigation
- Safety signs / emergency equipment demo
- Verified hospital map library
- Emergency help panel
- Saathi zero-key demo assistant
- Live browser GPS
- OpenStreetMap hospital lookup
- India hospital/city search via Nominatim
- OSRM road routing with a local estimate fallback
- Bengaluru demo location if GPS is blocked

## Optional keys only

- `OPENAI_API_KEY`: open-ended AI answers
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_ID`: Google sign-in
- `GOOGLE_MAPS_API_KEY`: Google Places hospital discovery
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`: Google embedded maps

If any optional service fails, the demo should continue through its zero-key fallback.
