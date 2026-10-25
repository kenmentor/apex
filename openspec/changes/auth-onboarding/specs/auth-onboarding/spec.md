## ADDED Requirements

### Requirement: Swipeable auth tabs

The system SHALL present Sign in and Sign up as swipeable tabs (tap also switches), with a short persuasive hero above the form.

#### Scenario: Switch methods

- **WHEN** a visitor swipes or taps the tabs
- **THEN** the active form switches with the selection indicator following

### Requirement: Email signup with verification link

The system SHALL allow signup with name, email, and password (bcrypt-hashed), auto-login, and send a verification link email.

#### Scenario: New signup

- **WHEN** a visitor signs up with valid details
- **THEN** an account is created, they are logged in, and a verification email is sent

### Requirement: Password-checked login with legacy fallback

The system SHALL check passwords on accounts that have one, while passwordless legacy accounts continue to log in and are prompted to set a password.

#### Scenario: Wrong password

- **WHEN** a login attempt supplies a wrong password for a password account
- **THEN** it is rejected with a generic invalid-credentials error

### Requirement: Google sign-in

The system SHALL offer Google sign-in when configured, verifying the ID token server-side and creating or returning the verified account.

#### Scenario: Google sign-in

- **WHEN** a visitor completes Google sign-in
- **THEN** a verified account exists (created if new) and they are logged in

### Requirement: 3-step onboarding

The system SHALL onboard new accounts through university (type-to-search with suggestions), department, then level, with progress indication.

#### Scenario: Complete onboarding

- **WHEN** a new user picks university, department, and level
- **THEN** the profile is saved and they land on home with a usable plan
