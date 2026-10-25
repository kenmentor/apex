## 1. Backend

- [x] 1.1 `src/lib/email.js` verification sender (Resend), reused by send-verification
- [x] 1.2 `POST /api/auth/signup` (bcrypt hash, auto-login, verification email)
- [x] 1.3 Login route checks passwords; legacy passwordless still works
- [x] 1.4 `POST /api/auth/google` (ID-token verify, find-or-create verified user)

## 2. Screen

- [x] 2.1 Rewrite `/auth` — hero, Embla swipe tabs, Google button, email forms
- [x] 2.2 Tight onboarding — university search, verify-any-code (mock), department, level, avatar picker
- [x] 2.3 Verify-code endpoint (ALLOW_ANY_CODE=true mock mode) + DiceBear avatar library + profile host allowlist

## 3. Verification

- [x] 3.1 Signup → login → verify-link → onboard walkthrough; legacy login unaffected; no build (user rule)
