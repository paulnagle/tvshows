# EAS Production Build & App Store Submission via GitHub Actions

## Top-Level Overview

Set up a GitHub Actions CI workflow that, on every git tag push matching `v*.*.*`, triggers an EAS production iOS build and submits the result directly to the Apple App Store. The project is already fully configured in `eas.json` with the correct `production` build profile and `submit.production.ios` credentials. The only missing pieces are the GitHub Actions workflow file and the `EXPO_TOKEN` secret.

---

## Sub-Tasks

### 1. Create an Expo Access Token and add it as a GitHub Actions secret

**Intent**  
EAS CLI must authenticate with Expo's cloud build service from within GitHub Actions. A personal access token (or robot token) is the only way to do this non-interactively.

**Expected Outcomes**  
- An Expo access token exists and is stored as `EXPO_TOKEN` in the GitHub repository's Actions secrets.

**Todo List**
1. Go to [expo.dev/accounts/paulnagles-team/settings/access-tokens](https://expo.dev/accounts/paulnagles-team/settings/access-tokens) (Account → Settings → Access Tokens).
2. Click **Create Token**, give it a descriptive name (e.g. `github-actions-production`), and copy the generated value.
3. In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret**.
4. Name the secret exactly `EXPO_TOKEN` and paste the token value.

**Relevant Context**  
- EAS CLI reads the `EXPO_TOKEN` env var automatically when present — no code changes needed.
- The EAS project ID (`9f4b60c1-35dd-4ff8-a6f0-6306aa0a6d98`) and owner (`paulnagles-team`) are already baked into `app.json`, so EAS CLI will target the correct project.

**Status** — `[x] done`

---

### 2. Create the GitHub Actions workflow file

**Intent**  
Add a workflow that installs dependencies, then calls `eas build` + `eas submit` using the `production` profile on every semver tag push (e.g. `v1.0.0`).

**Expected Outcomes**  
- `.github/workflows/production-ios.yml` exists.
- Pushing a tag like `git tag v1.0.0 && git push origin v1.0.0` triggers the workflow.
- The workflow runs `eas build --platform ios --profile production --non-interactive --no-wait` followed by `eas build:submit` (or the combined `eas submit` with the build ID returned by the first step).
- EAS handles the App Store upload using the credentials already defined in `eas.json`.

**Todo List**
1. Create the directory `.github/workflows/`.
2. Create `.github/workflows/production-ios.yml` with:
   - **Trigger**: `on: push: tags: ['v*.*.*']`
   - **Runner**: `ubuntu-latest` (EAS builds run on Expo's cloud, so the runner OS doesn't matter for the build itself)
   - **Steps**:
     1. `actions/checkout@v4`
     2. `actions/setup-node@v4` with the Node version matching the project (check `package.json` engines or use `lts/*`)
     3. `npm ci` to install dependencies
     4. `npm install -g eas-cli` to install EAS CLI globally (it is not in project devDependencies)
     5. `eas build --platform ios --profile production --non-interactive` — queues the build on EAS cloud and **waits** for it to finish
     6. `eas submit --platform ios --profile production --latest --non-interactive` — submits the most recent build for the `production` profile to the App Store
   - **Env**: `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}`

**Relevant Context**  
- `eas.json` `build.production` — `autoIncrement: true`, `ios.distribution: store`
- `eas.json` `submit.production.ios` — Apple ID, ASC App ID, and Team ID already present; no additional secrets needed for submission.
- `eas-cli` is intentionally **not** in `package.json` devDependencies; the global install step keeps it separate from the app bundle.
- Using `--latest` on `eas submit` targets the most recently completed build for that profile, which pairs cleanly with the preceding build step.

**Status** — `[x] done`

---

## Notes & Trade-offs

- **`--no-wait` vs waiting**: The plan uses the blocking (waiting) form of `eas build` so that the submit step only runs after a successful build. If you prefer faster CI feedback, you can pass `--no-wait` and submit in a separate scheduled/manual step.
- **Apple App Store Connect API Key (optional)**: If you want fully automated submission without 2FA prompts, you can add an App Store Connect API key as an additional secret and reference it in `eas.json` submit config via `appleTeamId` / `ascApiKeyPath`. The current config uses your Apple ID, which may require a one-time interactive 2FA step the first time; after that EAS caches the session on its servers.
- **Android**: This plan is iOS-only. A parallel Android job can be added later by duplicating the job with `--platform android`.
