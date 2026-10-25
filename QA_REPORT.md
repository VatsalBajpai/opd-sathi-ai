# OPD Saathi AI — Final QA Report

This build is designed to demonstrate the complete core flow with **zero API keys**.

## Verified in source/runtime checks
- TypeScript: PASS
- ESLint: PASS
- Zero-key `/api/chat`: PASS; returns a useful Saathi demo response
- Zero-key `/api/health`: PASS; reports optional integrations as disabled without failing
- Google auth status with no key: PASS; reports `configured: false`
- Bengaluru demo hospital lookup: PASS; returns four instant local demo results without waiting for public APIs
- Bengaluru demo road route: PASS; returns an instant route estimate without waiting for OSRM

## Core UI paths reviewed
- Patient demo login (`patient@example.com`)
- Staff demo login (`staff@opdsaathi.demo`)
- Account switching
- Patient sidebar navigation
- Staff sidebar navigation
- OPD token registration and copy
- Staff call-next and queue reset
- 2D/3D map selection, floor buttons and department selection
- Accessible-route toggle and written route steps
- Voice guidance fallback when browser speech is unavailable
- Verified Hospitals library and official-source links
- Emergency panel and number-copy fallbacks
- Nearby-hospital live GPS path and guaranteed Bengaluru demo path
- Saathi zero-key fallback and optional OpenAI upgrade

## Windows final gate
Run `CHECK_WINDOWS.cmd`. It performs:
1. dependency install if needed
2. TypeScript + ESLint
3. production build
4. runtime smoke tests on the built production server

The production build cannot be completed in the Linux sandbox because Next.js attempts to download a Linux SWC binary from npm, while outbound npm access is blocked. Windows is therefore the authoritative final-build environment for this hackathon project.
