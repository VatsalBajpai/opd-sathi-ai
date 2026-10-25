# Final hardening notes

This build is the frozen submission candidate.

## Verified in the build workspace

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- No TypeScript source errors
- No ESLint source errors

## Reliability fixes in this pass

- India-wide Google Places text search can work before GPS permission; GPS is still required for live distance/ETA/road navigation.
- Google map mode no longer invents a Bengaluru origin when the user has not shared location.
- Google ID-token verification now checks issuer as well as audience/email verification.
- `/api/health` reports integration configuration booleans without exposing secrets.
- Emergency Help includes 112, 102, and Karnataka 108 Arogya Kavacha.
- README and demo script now match the final 12-map library and <=2-minute submission-video requirement.
- `CHECK_WINDOWS.cmd` now runs install-if-needed, source checks, and a full production build.

## Final Windows verification

Double-click `CHECK_WINDOWS.cmd`, or run:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run build
```

Only upload/deploy after all three commands pass on the submission PC.
