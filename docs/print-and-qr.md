# Printing and QR codes

## Install

1. Database: run `docs/schema/009_print_audit.sql` once in pgAdmin (Query Tool). It lets the audit trail record a doctor's print.
2. Web: `cd web`, then `npm install qrcode` and `npm install -D @types/qrcode`.
3. Mobile: `cd mobile`, then `npm install qrcode`. This is plain JavaScript, so there is no rebuild; press `r` in Metro.
4. Restart the backend (`npm run dev` in `backend`) and the web app.

## What was added

- **QR code for a share link.** Shown when the link is created, on the phone (Share tab) and on the web (Share Records). It encodes the same `/s/<secret>` address as the link, so scanning with the ordinary camera opens the read-only page. The web also has a **Print QR** button, which prints just the QR with the sections and expiry. A QR can only be shown at creation, because the server keeps only a hash of the secret. For an old link, make a new one.
- **Patient: Print my record.** Button on the web Dashboard. Prints the profile and all six sections on A4. Use Save as PDF in the print window to keep a copy.
- **Doctor: Print record.** Button on the open-patient page. Prints everything the doctor can see. Each print is written to the patient's access history ("They printed your record"). If the print cannot be logged, it does not print.
- **Shared link page.** The Print button now prints a clean sheet containing only the sections the patient chose to share (no emergency contact unless it was ticked).
- Only the list of documents is printed, not the files themselves.

## Making the QR work on another phone

The QR holds `PUBLIC_WEB_URL` + `/s/<secret>`. With the default `http://localhost:5173`, only the laptop itself can open it. For a demo on real phones:

1. Put the laptop and the phone on the same Wi-Fi (or the laptop's hotspot) and find the laptop's address (`ipconfig`, for example `192.168.1.20`).
2. In `backend/.env` set `PUBLIC_WEB_URL=http://192.168.1.20:5173` and restart the backend.
3. Start the web app with `npm run dev -- --host`, and set `VITE_API_URL=http://192.168.1.20:4000` in `web/.env` so the shared page can reach the API from the phone.
4. Allow Node and Vite through Windows Firewall if asked.

For a real deployment, set `PUBLIC_WEB_URL` to the hosted address instead.
