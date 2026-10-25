# OPD Saathi — Final Test Checklist

Run these from the folder containing `package.json`:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run build
npm.cmd run dev
```

Before submission verify:

- [ ] Login page loads with no console-breaking error.
- [ ] Demo patient login opens patient workspace.
- [ ] `staff@opdsaathi.demo` opens staff workspace.
- [ ] Google Sign-In works after Client ID is configured; demo fallback still works if Google is unavailable.
- [ ] `/api/health` returns `ok: true` and shows which integrations are configured without exposing secrets.
- [ ] Best Hospital Nearby: GPS permission works on localhost/HTTPS.
- [ ] India hospital text search works with Google Places even before GPS; GPS adds distance/ETA/navigation.
- [ ] Google Maps/OSM fallback renders without crashing.
- [ ] Verified Hospitals sidebar opens and searches the 12 source-linked profiles.
- [ ] A hospital without a verified map shows `MAP NOT FOUND` rather than a fabricated map.
- [ ] 3D and 2D demo maps switch correctly; floors, rooms, accessible route and safety markers work.
- [ ] Saathi AI shows `AI connected` only when the OpenAI key is configured and returns a response.
- [ ] Token generation works; duplicate token warning works; copy token works.
- [ ] Staff `Call next patient` works and patient queue updates.
- [ ] Emergency Help shows 112, 102 and Karnataka 108; copy buttons work; nearest emergency hospital shortcut opens.
- [ ] Mobile width does not hide essential buttons; sidebar opens/closes.
- [ ] Vercel environment variables are configured and the final HTTPS URL is added to Google OAuth Authorized JavaScript Origins.
- [ ] Demo video is <= 2 minutes and under the organiser file-size/link requirements.
