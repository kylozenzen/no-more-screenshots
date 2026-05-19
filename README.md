# No More Screenshots — Calendar Standalone

This is the PostIQ Plan/calendar + Share Snapshot idea as its own Netlify-ready tool.

## What it includes

- Monthly calendar grid
- Mobile agenda fallback
- Click day to view posts/notes
- Add post
- Add planning note
- Upload CSV
- Load sample calendar
- Import scheduled posts from Buffer through `netlify/functions/buffer-proxy.js`
- Generate read-only `#share=` snapshot links

## What it intentionally excludes

- Composer
- Ideas
- Approvals
- Comments
- Receipts/deal workflow
- Strategy Snack Machine

## Deploy settings

- Build command: leave blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

## CSV columns

date,time,platform,channel name,caption,status
