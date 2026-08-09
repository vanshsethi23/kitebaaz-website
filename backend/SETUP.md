# Rooftop subscribe backend — setup (Google Sheet + Apps Script)

One-time setup, done while logged in as **kitebaaz.in@gmail.com** (the welcome
email is sent from whichever account deploys the script).

1. Go to https://sheets.new and name the spreadsheet
   **KITEBAAZ Rooftop Subscribers**. Nothing else to set up in the sheet —
   the script creates its own "Subscribers" tab with headers.
2. In the Sheet: **Extensions → Apps Script**. Delete the placeholder code and
   paste the full contents of `backend/Code.gs`. Save (Cmd+S).
3. Optional but recommended: in the editor, run the function **testWelcome**
   once. Google will ask you to authorize the script (Gmail + Sheets access) —
   approve it. You'll get the welcome email in your own inbox as a live test.
4. **Deploy → New deployment → Web app**:
   - Description: `rooftop v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click Deploy and copy the **Web app URL** (ends in `/exec`).
5. Send that URL to Claude (or paste it yourself into `index.html`, in the
   `#rooftop` form's `data-endpoint=""` attribute).

That's it. Each sign-up then:
- appends `Timestamp | Email | Source | Status` to the Subscribers tab,
- skips duplicates (no double emails on repeat sign-ups),
- sends the branded welcome email from kitebaaz.in@gmail.com,
- returns `{ ok: true }` so the site shows "You're on the rooftop. Watch the sky."

## Limits and notes

- Gmail sending quota on a standard account is ~100 recipients/day via Apps
  Script — plenty for the beta; revisit if sign-ups spike.
- To update the email copy later: edit `htmlBody_()` / `plainBody_()` in the
  Apps Script editor, then **Deploy → Manage deployments → Edit → New version**.
  (Editing code without creating a new version does NOT change the live web app.)
- Unsubscribes are manual for now: people reply "unsubscribe"; delete their row
  in the sheet.
