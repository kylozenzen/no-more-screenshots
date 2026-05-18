# No More Screenshots — Netlify Demo

A focused PostIQ-style Snapshot demo:

1. See planned posts.
2. Edit/import content.
3. Generate a client review link.
4. Let clients approve, request edits, or comment.

## Deploy

Drag this folder or ZIP into Netlify. `index.html`, `styles.css`, and `app.js` are at the root.

## What changed in this pass

- Simplified the app around the core flow: posts → generated link → client preview.
- Reworked the UI to feel closer to PostIQ's Snapshot/review pattern.
- Moved CSV/Buffer import into a drawer so the first screen is not busy.
- Improved readability with softer dark text, bigger type, and lighter cards.
- Kept static share links by encoding the Snapshot payload in the URL hash.

## Buffer Import

A lightweight `netlify/functions/buffer-proxy.js` scaffold is included. The demo still uses manual token-style import for testing. Full OAuth should be wired after the app has a final Netlify URL and registered Buffer redirect URI.
