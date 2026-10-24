# Velora

Movies, anime and series tracker built with Next.js App Router and React. The app keeps the original Velora design, Georgian/English interface, local library and Supabase synchronization.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Production:

```sh
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env.local` if you want to override the existing public Supabase project configuration. Set the same variables in your hosting provider:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The app uses the existing `lists` table with `user_id`, `data` (`items` and `tmdbKey`), and `updated_at`. Supabase authentication, email confirmation and password recovery use the existing project. Add your deployed URL and localhost URL to Supabase's allowed authentication redirect URLs for password recovery.

The catalog uses one server-side TMDB credential for all visitors, including guests and new accounts. Set `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN` in `.env.local` for local development and in your hosting provider’s environment variables for deployment. Never prefix these variables with `NEXT_PUBLIC_`. Visitors do not enter a key.

Run this project with `npm run dev`, or `npm run build` followed by `npm start`. Deploy to hosting that supports the Next.js server runtime (for example, Vercel or a Node.js server). Static HTML hosting such as GitHub Pages cannot run the `/api/tmdb` route. The repository’s own `next.config.mjs` keeps this application independent of configuration in parent folders.

## Data compatibility

The original storage keys (`watchlist.v1`, `velora.lang`, `velora.tmdbKey`, and sync flags) and backup format are retained. Browser storage belongs to an origin: when moving to a different domain or port, export a backup from the original site and import it, or sign in to restore your cloud library.

## Project structure

- `app/`: Next.js route, metadata and shared styles.
- `components/`: React interface and dialogs.
- `lib/`: library state, cloud synchronization, translations, media and import utilities.
- `public/`: installable web app manifest and icons.
- `tests/`: regression checks for import and media behavior.

Run checks with `npm test` and `npm run build`.

## Deploy

Import this repository into a Next.js hosting provider such as Vercel. Use the repository root as the project root, `npm run build` as the build command, and the Next.js preset. This repository contains a Node.js Next.js app; GitHub Pages does not run its server.

## Profile photos

Run `supabase/avatar-storage.sql` once in your Supabase project's SQL Editor to create the `avatars` bucket and owner-only upload/delete policies. Photos can be moved, zoomed and cropped in a dialog, then converted to 512×512 WebP in the browser; the public image URL is saved in the user's Supabase metadata so the cabinet and main-page avatars share it across devices. Uploaded files are limited to 1 MB after processing; source JPG/PNG/WebP photos can be up to 50 MB. Profile metadata refreshes when the library synchronizes or the tab becomes visible again.

### Netlify

The included `netlify.toml` uses Node.js 22, `npm run build`, and `.next` as the publish directory. Netlify automatically applies its Next.js adapter so `/api/tmdb` runs as a server function. Deploy the Next.js project rather than uploading an `out` directory with Netlify Drop.

Set `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN` in Netlify’s environment variables with **Builds** and **Functions** scopes before deploying. Add the final site URL to Supabase’s authentication redirect allowlist for password recovery. No private keys belong in `netlify.toml` or Git.
