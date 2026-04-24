# Deploy the Vercel Function

Two paths. Both work. Pick one.

- **Path A — GitHub + Vercel dashboard**: easiest, everything in the browser, takes about 15 minutes. Recommended.
- **Path B — Vercel CLI**: slightly faster for updates but requires installing a tool.

Your deployed URL will look like `https://your-project-name.vercel.app/api/relay`.

---

## Path A — Deploy via GitHub

### 1. Create a GitHub repo for this folder

Sign in to https://github.com and click **New repository** (top right). Name it anything like `mhrv-vercel-relay`. Leave it **private**. Click **Create repository**.

Upload all files from `failsafes/02-vercel/` to the new repo:

- Option 1 (web UI): on the empty repo page, click **uploading an existing file**, drag-and-drop the entire `02-vercel` folder contents.
- Option 2 (git): use the git CLI if you know how — `git init`, `git add .`, `git commit`, `git push`.

Make sure the repo has these files at the root:
```
api/relay.js
vercel.json
package.json
.gitignore
```

(Do NOT upload this DEPLOY.md — it's just for you.)

### 2. Create a Vercel account

Sign up at https://vercel.com with your GitHub account. Free tier is fine. No credit card needed.

### 3. Import the repo

On the Vercel dashboard, click **Add New** → **Project**. Vercel will list your GitHub repos. Find `mhrv-vercel-relay` and click **Import**.

On the configuration screen, leave all defaults as-is. **Framework Preset** should say "Other" — that's correct.

### 4. Set the auth key environment variable

Still on the import screen, expand the **Environment Variables** section. Add:

- **Name**: `AUTH_KEY`
- **Value**: the same auth key you use in your Apps Script
- **Environment**: leave all three checked (Production, Preview, Development)

Click **Deploy**.

### 5. Wait for build to finish

Vercel will deploy in ~30 seconds. When done, you'll see a success page with a URL like `https://your-project-name.vercel.app`. **Your relay endpoint is at `https://your-project-name.vercel.app/api/relay`** — note the `/api/relay` suffix.

Copy that full URL.

### 6. Test it

```
bash ../test-backend.sh https://your-project-name.vercel.app/api/relay YOUR_AUTH_KEY
```

Or PowerShell:

```
powershell -File ..\test-backend.ps1 -Url https://your-project-name.vercel.app/api/relay -AuthKey YOUR_AUTH_KEY
```

Should print `OK: backend returned protocol-compatible response`.

---

## Path B — Deploy via Vercel CLI

### 1. Install Node.js and the CLI

```
npm install -g vercel
```

### 2. From inside `02-vercel/` run

```
vercel login
```

Then:

```
vercel --prod
```

Answer the prompts. For **"In which scope...?"** pick your account. For **"Link to existing project?"** pick No. For project name, use something like `mhrv-vercel-relay`.

Wait for deploy to finish. Vercel prints a URL.

### 3. Set the auth key

```
vercel env add AUTH_KEY production
```

Paste your auth key. Then redeploy:

```
vercel --prod
```

### 4. Test

Same as Path A step 6.

---

## Updating later

- **GitHub path**: push a new commit to the repo. Vercel auto-deploys.
- **CLI path**: `vercel --prod` from the project folder.

Environment variables persist across deploys.

---

## Troubleshooting

### `"e": "unauthorized"`

`AUTH_KEY` value doesn't match. Go to your Vercel project → **Settings** → **Environment Variables**, check the value, **then redeploy** (env changes require a redeploy — click the three dots on the latest deploy and pick **Redeploy**).

### `"e": "server misconfigured: AUTH_KEY not set"`

You skipped step 4 (Path A) or step 3 (Path B). Add the env var and redeploy.

### Test script returns 404

You probably hit the root URL instead of `/api/relay`. The endpoint lives at `/api/relay`, not at the root. Root returns the disguise HTML.

### "Function execution timed out"

The target URL you're fetching is slow. `vercel.json` sets max duration to 60 seconds (the cap on Vercel's Hobby plan). For most relay use cases this is plenty.

### How much will this cost me?

Vercel Hobby tier: 100 GB-hours of function execution per month. For relay traffic that's thousands of requests per day before you come close. You stay in free tier for any normal personal use.

### Can I use a custom domain?

Yes. In Vercel Settings → Domains, add your domain. You'll need to point a DNS record at Vercel. Free to set up.
