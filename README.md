# MIA Sales CRM (React + Vite)

This is a React rewrite of the same app — same Firebase project, same
Firestore collections (`leads`, `orders`, `invoiceRequests`, `users`,
`notifications`, `invites`), same features. Nothing changes on the backend;
only how the front end is organized.

## Why this exists

The old version was two files: one ~1600-line `app.js` and one ~530-line
`index.html`, both hand-wired with `document.querySelector` and manual DOM
building. That's genuinely hard for a second person to open and understand.
This version breaks the same functionality into about 35 small files, each
handling one thing (one tab, one card, one form), which is what most people
expect when they open a JS project.

## Folder structure

```
src/
  firebase.js              Firebase init (same project/config as before)
  data/products.js          Product catalog (same data as before)
  utils.js                  Small shared helpers (date formatting, etc.)
  App.jsx / AppShell.jsx     Top-level routing between login/setup/app
  i18n/                      Translations (en/he) + language context
  contexts/                  Auth state, live Firestore data, active tab
  hooks/                     Reusable data-fetching + UI helpers
  components/
    Login.jsx, AccountSetup.jsx, Header.jsx, Nav.jsx, Home.jsx, ...
    leads/      Cold leads + progress leads
    stores/     Store cards, certs, in-card order/invoice forms
    orders/     Store orders, customer orders, order history
    invoices/   Invoice requests, completed, invoice history
    admin/      Invites + team management
  styles/global.css          All the original CSS, unchanged (RTL-safe)
```

Every Firestore read/write happens in the same place it happened before —
this is a reorganization, not a rewrite of the business logic. If something
behaves differently from the old version, that's a bug worth reporting.

## One behavior that's actually fixed, not just moved

The old "switching to Hebrew gets you stuck" bug is structurally impossible
here: language switching is just React state now, with no full-page reload
at all, and the Firestore save is properly awaited. There's no longer a
window where the page can reload before the save finishes.

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (the LTS version is
fine). Then, from this folder, in a terminal:

```
npm install        # one-time, downloads dependencies
npm run dev         # starts a local dev server, prints a URL to open
```

Leave that running and open the printed URL (usually
`http://localhost:5173`) in your browser — it behaves like the old
`index.html` did, just with a build step in front of it now. Changes to any
file under `src/` reload the page automatically.

## Building for deployment

```
npm run build
```

This produces a `dist/` folder containing the final static site (HTML, JS,
CSS, all bundled and minified). That `dist/` folder is what Firebase
Hosting should serve — **not** the `src/` folder, and not this project root.

If your `firebase.json` currently points hosting at `"public": "."` or
similar, change it to:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

Then the deploy flow is:

```
npm run build
firebase deploy --only hosting
```

## Your logo

Drop `logo.png` into the `public/` folder (see `public/README.txt`). Vite
copies everything in `public/` straight into the built site, so it'll show
up in the header exactly like before. If it's missing, the header falls
back to showing "MIA DYNAMICS" as text — nothing breaks.

## Adding a new tab/feature later

Since you mentioned expanding this: the pattern to copy is a folder like
`src/components/orders/` — one `*Tab.jsx` file that reads from
`useData()` and renders a list, plus one card/row component per item. Wire
a new tab into `src/AppShell.jsx`'s `TAB_COMPONENTS` map and
`src/components/Nav.jsx`, the same way `admin` or `stores` are wired in now.
