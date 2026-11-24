# Offline on the phone (stages 7b–7d)

The phone app now keeps its own encrypted copy of the patient's records and works with no internet. The server side is described in `docs/sync-api.md`.

## Install (once)

```
cd mobile
npx expo install expo-sqlite expo-crypto expo-network
npm install @noble/hashes
```

In `mobile/app.json`, inside `"plugins"`, add this line next to `"expo-secure-store"`:

```
["expo-sqlite", { "useSQLCipher": true }],
```

Delete two files that are no longer used:

```
rm mobile/src/context/restoreSession.ts mobile/src/utils/token-storage.ts
```

SQLCipher needs a development build, not Expo Go: `npx expo run:android` (phone on USB, USB debugging on). If the app says "This build has no database encryption", the plugin line is missing or the build is old; add the line and run `npx expo run:android` again.

## What lives where

- `src/offline/` is the whole offline engine. `store.ts` keeps records, the queue of waiting changes, conflicts and refused changes in SQLite. `engine.ts` sends the queue and brings in new changes. `session.ts` handles accounts, offline sign-in and the device key. `expoDb.ts` opens the SQLCipher file. `transport.ts` is the HTTP call to `POST /sync`.
- One database file per account on the phone (`meditrack_<hash>.db`), encrypted with a random 256-bit key kept in the phone's secure storage. Signing out keeps it. Settings → Sync & offline → "Remove my data from this phone" (or "Remove" on the login screen) deletes it.
- Offline sign-in checks the password against a salted scrypt hash kept in secure storage. It is replaced every time the patient signs in online, so it follows the server's password.
- Going online after an offline sign-in: the phone swaps its device key for a fresh login token (`POST /auth/device-refresh`) and syncs, with no password. The key is replaced on every use. If the server refuses it (90 days of not contacting the server, signed out from another device, password change that revoked devices), the app shows "Sign in to sync", keeps everything and asks for the password once.
- A change made on the phone is checked against the version it was made from. If the same record changed elsewhere, nothing is overwritten: the patient sees both versions and picks "Keep mine" or "Keep theirs". An edit beats a delete.

## Things that still need a connection

Share links, documents (adding, editing, removing, opening the file; their details are listed offline), and profile edits. With "Sync with server" off the app makes no internet calls at all.

## Checks to do on the real phone

1. Sign in online, wait for "Up to date". Open More → Sync & offline.
2. Airplane mode on. Close the app completely and open it again: you are still signed in and see your records.
3. Still offline: add an allergy, edit a medicine, delete a condition. Home says "N changes will be sent when you are connected".
4. Airplane mode off, wait about 10 seconds (or tap Sync now): "Up to date". Check the same records on the web app.
5. Sign out, airplane mode on, sign in: it works with the saved data. Wrong password is refused.
6. After step 5's offline sign-in, turn airplane mode off and add something: it syncs with no password prompt.
7. Conflict: with airplane mode on, edit an allergy on the phone; edit the same allergy on the web; airplane mode off; Sync now. "1 record needs your decision": both versions show, Keep mine / Keep theirs both work.
8. Switch "Sync with server" off: status says "Working offline", Share shows that sync is off. Switch on again: waiting changes go.
9. Sign in as a second account on the same phone: it gets its own records; the first account's records are not shown. Sign back in as the first: its records are intact.
10. Encryption check (needs a rooted phone or a debug build with adb run-as): `adb shell run-as <package> cat databases/meditrack_*.db | head -c 100` must be unreadable bytes, not "SQLite format 3".
11. Remove data on this phone, then sign in with airplane mode on: refused ("Unable to reach the server...").
