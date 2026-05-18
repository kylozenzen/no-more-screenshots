# No More Screenshots — Netlify Demo v0

A standalone, Netlify-ready demo for a client-facing content calendar review link.

## What works

- Sample data
- CSV import
- Manual post creation and editing
- Client review view
- Approve / Needs Edits / comments
- Owner status dashboard
- Static share links using URL-encoded Snapshot payloads
- Strategy Snack Machine starter ideas
- Netlify Function scaffold for Buffer scheduled post import

## Deploy to Netlify

1. Drag this folder or the ZIP into Netlify.
2. Netlify should publish the root folder.
3. The included `netlify/functions/buffer-proxy.js` will deploy as a serverless function.

## Buffer import note

This build includes a **manual token/API key-style Buffer import** through:

`/.netlify/functions/buffer-proxy`

Set `BUFFER_GRAPHQL_ENDPOINT` in Netlify environment variables if Buffer's endpoint differs from the default:

`https://graph.buffer.com/graphql`

Full OAuth should be added after registering the final app URL and redirect URI with Buffer.

## CSV format

Supported columns:

- date
- time
- platform/channel
- caption/copy/text
- media url/mediaUrl/asset/link
- status
- note/notes
