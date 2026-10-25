## Why

Auth is a plain email box with no password, no Google, and a long-feeling stepped form. First impressions decide retention: signup must be artistic, persuasive, and over in under a minute — swipe between sign in/up, one-tap Google, or email+name+password with a verification link, then a 3-tap onboarding (university → department → level).

## What Changes

- New auth screen: persuasive hero, swipeable Sign in/Sign up tabs (Embla, tap also works), Google button (GIS, hidden if no client ID configured), email forms.
- Signup: name + email + password (bcrypt-hashed), auto-login, verification link email via Resend.
- Login: password-checked when the account has one; legacy passwordless accounts keep working and are prompted to set a password.
- Google: ID-token verified server-side (`google-auth-library`), find-or-create verified account.
- Onboarding stays 3 steps (university type-to-search → department → level) with tighter copy and progress dots.

## Capabilities

### New Capabilities

- `auth-onboarding`: swipeable auth screen, email+password signup/login, Google sign-in, verification email on signup, 3-step onboarding UI.

### Modified Capabilities

- None (existing login route gains password checking without breaking passwordless accounts).
