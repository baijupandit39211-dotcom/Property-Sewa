# Unit Test Report

- Date: 2026-05-25
- Scope: `server/src/modules/property/utils/reservation.utils.ts`
- Command: `pnpm --dir server test`
- Framework: Vitest

## Result

- Test files: 1 passed
- Tests: 6 passed, 0 failed
- Duration: 977ms

## Covered Behaviors

- Reservation status normalization (`reserved`, `paid`, `none`, unknown)
- Active vs expired reservation time logic
- Buyer visibility rules for active reservation
- Reservation default assignment window
- Reservation clear/reset behavior
- Auto-expire + persistence via `save()`

## Screenshot Evidence

Main app screenshot (attach/replace with test-run screenshot if needed):

![Dashboard Screenshot](C:/property-sewa/dashboard-final-check.png)
