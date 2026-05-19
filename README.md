# No More Screenshots Lite

Simplified MVP demo:

**Import posts → see the calendar/list → generate a clean read-only Snapshot link.**

## Intentionally removed

- Approval buttons
- Comments
- Client status dashboard
- Deal/proof tracking
- Strategy Snack Machine inside the app

Those belong in Receipts or later product layers.

## Included

- Static Netlify-ready app
- Sample posts
- CSV upload
- Add/edit/delete posts
- List/calendar Snapshot preview
- Show/hide media and notes
- Static URL-hash share link
- Buffer import scaffold via Netlify Function

## CSV columns

Use:

```csv
date,time,platform,caption,mediaUrl,note
```

## Deploy

Upload this folder to Netlify or connect it as a repo.

## Buffer note

`netlify/functions/buffer-proxy.js` is a scaffold. Replace the endpoint/query with the working scheduled-post import from PostIQ when ready.
