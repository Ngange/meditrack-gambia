# Offline sync API (for the phone app)

All sync routes need the patient's login token. Wrong or unknown things are plain 400/404/409/422 (never 401/403, which sign the app out). The phone is the only client; the web app stays online.

## Device keys

- **Sign in / register** (`POST /auth/login`, `POST /auth/register`) accept an optional `device: { name, platform: "android", deviceKey? }`. For a patient on Android the response then includes `device: { device_id, device_key }`. Send the previous `deviceKey` when signing in again on the same phone so its device record is reused. Keep `device_key` in secure storage.
- **Get a token without the password** (`POST /auth/device-refresh`, body `{ deviceKey }`) returns `{ token, user, device }` with a replacement `device_key`. **Store the new key straight away.** The previous key stays valid for 10 minutes in case the response is lost. Every failure (unknown, revoked, wrong, suspended account, unused for 90 days) is the same `400 "Sign in again to sync."`: the app should then ask for a normal sign-in, keeping all local data and queued changes. The 90 days are counted by the server when the phone asks, so a phone that is offline is never affected.
- `GET /sync/devices` lists the account's phones. `DELETE /sync/devices/:id` and `DELETE /sync/devices` sign one or all of them out (the phone's next refresh fails). A password change must call `deviceService.revokeAllForUser(userId)`.
- An account keeps at most 10 phones; registering an 11th drops the one unused longest.

## One sync: `POST /sync`

Request: `{ deviceId, cursor, changes, limit? }`
- `cursor`: the highest version the phone has seen (0 the first time).
- `changes`: up to 200, applied in order, each on its own. A change is `{ op: "create"|"update"|"delete", type, id, baseVersion?, data? }`.
  - `type`: `allergies`, `conditions`, `visits`, `medications`, `lab_results` (documents are read only).
  - `id`: a UUID the phone chooses when it creates a record, so a retry never duplicates it.
  - `data`: the same body the matching REST route takes (e.g. `{ allergen, severity }`, `{ testName, testDate, visitId }`). Create a visit before the records that link to it.
  - `baseVersion`: required for `update` and `delete`: the `version` the phone last saw for that record.
- `limit`: how many changes to send back (default 300, max 500).

Response: `{ results, changes, cursor, hasMore, reset, profile, serverTime }`
- `results[i]` matches `changes[i]`: `{ id, type, op, status, ... }`
  - `applied`: `version` (the record's new version, or the deletion's), `record` (create/update). `deleted: true` means it was created earlier but deleted since: remove it locally. `restored: true` means an update brought back a record deleted elsewhere.
  - `conflict`: `reason: "changed_on_server"`, `server_record`, `server_version`. Nothing was changed. **Keep theirs**: replace the local copy with `server_record`. **Keep mine**: send the same change again with `baseVersion = server_version`.
  - `rejected`: `code` and `message`. `invalid`, `duplicate`, `not_found`, `not_allowed`: show the message and drop or fix the change. `server_error`: keep the change and retry later.
- `changes[]` (the feed): `{ version, type, id, deleted, record? }`, oldest first. Apply in order: upsert `record` by `id`, or delete when `deleted`. `record` includes `entered_by` for doctor entries and the usual fields; documents carry details only.
- Save `cursor` after applying the feed. If `hasMore`, call again with that cursor (and no changes).
- `reset: true`: the server's data was reset. Throw away the local copy of the account's records and apply this feed as a fresh download.
- `profile`: the patient profile (read only on the phone).

Notes: a visit's records are separate changes, so a visit and its records are not saved all-or-nothing offline. Versions are per patient, go up by one for every change made by anyone (patient, doctor, web, phone), and have no gaps. Deleted records leave a tombstone that is kept for good.
