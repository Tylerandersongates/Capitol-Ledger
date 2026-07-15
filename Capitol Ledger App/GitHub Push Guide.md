# GitHub Push Guide

## Goal

Push the local CapitolWonk CE app folder to the GitHub repository that Vercel will deploy from.

## Why This Is Needed

Vercel can be connected to your GitHub account, but it still needs the actual CapitolWonk CE code inside a GitHub repository. The local app folder is not a Git repository until `git init` is run from the project folder.

## Project Folder

```bash
cd "/Users/tylergates/Documents/Codex/2026-05-14/we-are-going-to-create-a"
```

## Safety Check

The project `.gitignore` already excludes local secrets and build folders:

- `.env.local`
- `.env`
- `.next`
- `.tools`
- `node_modules`
- logs and coverage files

Do not manually upload `.env.local` to GitHub.

## First Push Commands

Replace `YOUR-GITHUB-REPO-URL` with the GitHub repo URL. For the current CapitolWonk CE repo, use:

```text
https://github.com/Tylerandersongates/Capitol-Ledger.git
```

Then run:

```bash
cd "/Users/tylergates/Documents/Codex/2026-05-14/we-are-going-to-create-a"
git init -b main
git status --short
git add .
git status --short
git commit -m "Initial CapitolWonk CE app"
git remote add origin YOUR-GITHUB-REPO-URL
git push -u origin main
```

## If Git Says Remote Already Exists

Use:

```bash
git remote set-url origin YOUR-GITHUB-REPO-URL
git push -u origin main
```

For this project, the current GitHub location is:

```bash
git remote set-url origin https://github.com/Tylerandersongates/Capitol-Ledger.git
```

## After The Push

1. Open the GitHub repo and confirm these exist at the top level:
   - `package.json`
   - `app`
   - `components`
   - `lib`
   - `prisma`
   - `next.config.mjs`
2. Open Vercel.
3. Import or reconnect the GitHub repo.
4. Use root directory `./`.
5. Use framework preset `Next.js`.
6. Let Vercel create the first deployment.
7. After the deployment URL exists, set `NEXT_PUBLIC_APP_URL` in Vercel to that URL and redeploy.
