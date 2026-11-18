# Green Bill Book

Offline-ready Progressive Web App (PWA) for Indian shopkeepers, medical stores, farmers, dairy owners, retailers, and wholesalers to manage billing, inventory, party Udhar Khata ledgers, and monthly Profit & Loss reports.

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Type-check:

```bash
npm run lint
```

---

## Option 1: Deploy on Netlify (Recommended)

### Method A — Connect via GitHub (Automatic Deploys)
1. Push this project to a GitHub repository (`main` branch).
2. Log in to [Netlify](https://app.netlify.com/) and click **Add new site → Import an existing project**.
3. Select your GitHub repository.
4. Netlify automatically detects `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `22`
5. Click **Deploy site**.

### Method B — Drag & Drop (`dist/`)
1. Run `npm install && npm run build`.
2. Drag and drop the generated `dist/` folder into [Netlify Drop](https://app.netlify.com/drop).

---

## Option 2: Push to GitHub & Deploy on GitHub Pages

1. Initialize and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Green Bill Book"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, open your repository → **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` workflow will automatically typecheck, build with your repository base path, and publish the live PWA URL.

---

## Convert to Android APK

Once deployed to Netlify (or GitHub Pages) over HTTPS:
1. Open [PWABuilder](https://www.pwabuilder.com/) and enter your live Netlify URL.
2. Click **Package for stores → Android** to generate a signed Android APK / AAB package directly from the Web App Manifest and Service Worker.
