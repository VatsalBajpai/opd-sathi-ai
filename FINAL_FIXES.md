# OPD Saathi — Final Reliability Pass

This build is designed so the hackathon demo does not depend on API keys.

Verified in source:
- TypeScript passes (`npm run typecheck`)
- ESLint passes (`npm run lint`)
- Every app button has an onClick/submit action
- Every anchor has an href
- Patient and staff one-tap demo login are local
- Saathi has an instant browser fallback if API/OpenAI is unavailable
- Bengaluru Demo Location has an instant browser hospital dataset and route
- Bengaluru demo map renders locally without Leaflet/Google/OSM
- Emergency -> nearest hospital preselects Emergency care
- Voice route shows a browser fallback message if speech is unavailable
- Queue/token/staff call-next/reset are local browser state
- Verified Hospitals library is bundled locally; source documents still require internet to open

Final Windows gate:
1. `npm.cmd install`
2. `npm.cmd run check`
3. `npm.cmd run build`
4. `npm.cmd run dev`

No `.env.local` is required for the zero-key demo.
