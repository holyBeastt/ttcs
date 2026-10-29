# TTCS Mobile MVP

Flutter read-only dashboard for personal Vượt Giờ and NCKH statistics.

## Run locally

Flutter is installed at `/home/linh/flutter` in the current development environment. From this directory:

```bash
export PATH="$HOME/flutter/bin:$PATH"
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=https://corymbose-tessie-guiltlessly.ngrok-free.dev
```

The app calls the backend directly through `ApiClient` and feature repositories. Widgets do not call URLs directly and no business formula is calculated in Flutter.

## Build

```bash
flutter test
flutter analyze
flutter build web --release --dart-define=API_BASE_URL=https://corymbose-tessie-guiltlessly.ngrok-free.dev
```

Android has two installable flavors with separate app data:

```bash
# Existing local app: TTCS Mobile (com.example.mobile_app)
flutter build apk --debug --flavor dev

# Server app: TTCS Prod (com.example.mobile_app.prod)
flutter build apk --release --flavor prod \
  --dart-define=API_BASE_URL=http://42.112.213.93:8888
```

The prod server currently serves HTTP on port 8888, so the prod Android
manifest permits cleartext traffic. Credentials and tokens travel without
encryption; migrate the server to HTTPS for production use.

Android project files are included. For a physical Android phone on the same LAN,
use the host LAN address instead of `localhost`:

```bash
flutter run -d <device-id> \
  --dart-define=API_BASE_URL=http://192.168.0.113:3000
```

The debug Android manifest permits cleartext HTTP for local development only. Use
HTTPS and remove that debug-only setting before a production release.

Use the DDEV URL or another backend URL when needed:

```bash
flutter run -d chrome --dart-define=API_BASE_URL=https://ttcs.ddev.site
```

## Current scope

- Login, refresh token and secure local session storage.
- Academic-year and two data scopes: projected (live) and official (locked
  Vượt Giờ snapshot).
- Personal Vượt Giờ and NCKH summaries, including source breakdown and
  updated/stale-cache indicators.
- Personal detail pages for Vượt Giờ activities and NCKH works (portrait,
  expandable read-only records).
- Department/faculty statistics with permission-aware unit filters, Vượt Giờ
  summary/detail rows and aggregate NCKH rows for each faculty/department.
- The department/faculty tab intentionally uses summary cards and lists rather
  than a chart or lecturer detail list; all rows remain at faculty/department
  aggregate level.
- In-app notifications (read-only), account details, contact updates and
  password rotation.
- Statistics remain read-only with explicit scope labels; account mutations are
  limited to the signed-in user's phone/address and password. Business
  formulas remain on the backend and widgets never call URLs directly.
- Error, empty, retry, auth-expiry and permission-denied states.

The current mobile plan keeps all teaching/overtime/NCKH data read-only.
Account mutations use dedicated bearer-token endpoints and do not allow edits
to department, role, salary, HSL, tax, identity or bank fields. Mutation
workflows for business data, push-device registration, unread/read state and
deep-link navigation require separate backend contracts and are not enabled.

## Backend prerequisite

The local DDEV project must be running before using real API data. If Docker is unavailable, Flutter tests and web builds can still run, but login/dashboard integration cannot be verified against the local backend.
