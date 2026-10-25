# OPD Saathi — Keys + Verified Map Setup

## 1) Google Maps / hospital search keys

Use one Google Cloud project.

Enable:
- Places API (New)
- Maps Embed API

Create two API keys:

### Server key
Environment variable:
`GOOGLE_MAPS_API_KEY`

Use it only on the server for Places API (New). Restrict the key to the Places API (New). Do not put it in browser code.

### Browser embed key
Environment variable:
`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`

Restrict it by HTTP referrer to:
- `http://localhost:3000/*`
- your deployed HTTPS domain, for example `https://your-app.vercel.app/*`

Restrict the key to Maps Embed API only.

## 2) Google Sign-In client ID

In Google Cloud Console open Google Auth Platform > Clients and create a Web application OAuth client.

Authorized JavaScript origins:
- `http://localhost:3000`
- your final deployed origin, for example `https://your-app.vercel.app`

Copy the Client ID into both:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_ID`

## 3) OpenAI API key

Create a project-level secret API key in the OpenAI API platform and store it only in `.env.local` or the hosting provider's environment variables.

Environment variable:
`OPENAI_API_KEY`

Do not commit `.env.local` or paste the key into frontend source code.

## 4) Verified real hospital map behavior

### Tata Memorial Hospital, Mumbai
OPD Saathi includes a verified official-map profile for Tata Memorial Hospital, Mumbai.

Source:
Tata Memorial Hospital — Patient Information Booklet 2026

Official source URL:
https://tmc.gov.in/assets/PDF/TMH_Patient_Booklet_2026_Low%20Res.pdf

The app embeds the hospital-published Building Layout page directly and shows selected department/building/floor locations from the same official booklet.

### Other hospitals
For every other selected hospital:
1. OPD Saathi checks public indoor/building geometry.
2. If usable real geometry exists, it displays it.
3. If only a building footprint exists, it says room-level indoor navigation is unavailable.
4. If no verified public indoor/floor map is found, it displays `MAP NOT FOUND`.

OPD Saathi does not fabricate a real hospital floor plan.
