# Brown Calendar

A 13-month calendar counted from the Nativity, installable on your phone as an app.

- 13 months of 28 days (Peter … Stephen), weeks of Lightday → Restday
- The 1st Day of the Year (December 25) and Leap Day sit outside the week
- Brown and Gregorian calendars side by side, plus a ? converter both ways
- Notes for each day (up to 5,000 characters)
- Tasks with repeats and up to 7 reminders
- Works offline; everything is stored only on your phone (see `privacy-policy.html`)

## Publish it (GitHub Pages)

1. On GitHub, open this repository → **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, branch **main**, folder **/ (root)**, then **Save**.
3. After a minute the app is live at `https://natebrown77777.github.io/brown-calendar/`.

## Install it on your phone

- **Android (Chrome):** open the link, then tap **Install app** at the top (or ⋮ → *Install app*).
- **iPhone (Safari):** open the link, tap **Share → Add to Home Screen**.

## Reminders

Turn on *Notification* for a task and allow notifications when the phone asks.

- When you open the app, any reminder due that day pops up as a phone notification.
- On Android, once installed, Chrome also checks a few times a day in the background (the phone decides exactly when).
- iPhones only show reminders when the app is opened; iOS doesn't let web apps check in the background.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app |
| `brown-core.js` | Calendar math, repeating tasks and reminder logic |
| `sw.js` | Service worker: offline use and background reminder checks |
| `manifest.webmanifest`, `icons/` | App name and home-screen icons |
| `privacy-policy.html` | Privacy policy |
