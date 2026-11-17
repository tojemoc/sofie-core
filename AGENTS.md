# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Sofie Core is a Meteor/Node.js monorepo for TV studio automation. The main dev stack is:

| Service | Port | Purpose |
|---------|------|---------|
| Meteor server | 3000 | Backend API, DDP, job-worker host |
| Vite WebUI | 3005 | React frontend (proxies API to Meteor) |
| Embedded MongoDB | (Meteor-managed) | Primary datastore in dev |

See `DEVELOPER.md` for full developer documentation.

### Node.js and Yarn

- Requires **Node.js >= 22.20.0** (`.nvmrc` / `.node-version`: `22.22.0`).
- Uses **Yarn 4.14.1** via corepack (`packageManager` in root `package.json`).
- On Cloud Agent VMs, `/exec-daemon/node` may shadow nvm. **Prepend nvm's bin to PATH** before running yarn/meteor:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22.22.0
export PATH="$NVM_DIR/versions/node/v22.22.0/bin:/usr/local/bin:$PATH"
```

### Meteor (one-time VM setup)

`yarn install` postinstall runs `meteor npm install` and **requires Meteor 3.4.1** on PATH:

```bash
curl -s "https://install.meteor.com/?release=3.4.1" | sh
```

Meteor installs to `~/.meteor` with a launcher at `/usr/local/bin/meteor`.

### Common commands

All commands run from the repo root unless noted.

| Task | Command |
|------|---------|
| Install deps | `yarn install` |
| Build packages | `node ./scripts/install-and-build.mjs` |
| Start dev (Meteor + Vite + watchers) | `yarn dev` |
| Full setup + dev | `yarn start` |
| Package unit tests | `yarn unit:packages` |
| Meteor unit tests | `yarn unit:meteor` |
| Lint (all) | `yarn lint` |
| Reset everything | `yarn reset` then `yarn start` |

Use a **tmux session** for `yarn dev` — it is long-running and starts multiple concurrent processes.

### Health check

- UI: `http://localhost:3005` (title "Sofie", Rundowns landing page)
- Backend health JSON: `http://localhost:3000/health`
- Fresh dev DB may show `FAIL` / version-mismatch warnings until migrations run; the UI still loads and connects.

### Optional services (not needed for core dev)

- Playout gateway: `cd packages/playout-gateway && yarn dev`
- MOS gateway: `cd packages/mos-gateway && yarn dev`
- Docs site: `yarn docs:serve` → port 4000

### Gotchas

- First `yarn install` is slow (Meteor + monorepo packages).
- `NODE_ENV` must **not** be `production` during install.
- `yarn dev --ui-only` reduces CPU/memory if you only edit WebUI/Meteor code.
- Pre-commit hook runs `yarn lint-staged` (via husky).
- **Caspar AMCP patches are dormant:** `.yarn/patches/` (repo root) ships
  `casparcg-connection-*.patch` (emits `DECKLINK DEVICE <n>` for PlayDecklink/LoadbgDecklink)
  and `casparcg-state-*.patch` (`STING OVERLAY=`), but **neither is registered in
  `resolutions`/`patchedDependencies`** — `yarn.lock` resolves plain `npm:7.0.0`/`npm:4.0.0`
  and the patch files target nightly versions. The fixes are NOT applied to a fresh install;
  `playout-gateway` `decklinkAmcp.spec.ts` covers the intended serialization. To activate,
  re-target the patches at the locked versions and add `patch:` resolutions.

### Fork delta vs upstream (`Sofie-Automation/sofie-core`)

`main` carries ~29 local commits over upstream `ddf17f57e`. The load-bearing additions:

| Area | What |
|------|------|
| Peripheral API — content status | `peripheralDevice.packageManager.getContentStatusForRundown` → `packages/sofie-core/src/api/integration/rundownContentStatus.ts`. Studio-scoped; per-piece status is evaluated sequentially (slow on big rundowns). |
| Peripheral API — playout state | `peripheralDevice.ingest.getRundownPlayoutState` → `api/integration/rundownPlayoutState.ts`. Drives the Rundown Editor on-air System locks. |
| Peripheral API — part settings | `getRundownPartSettings` + `getRundownPartAutoNext` → `api/integration/rundownPartSettings.ts` / `rundownPartAutoNext.ts`. Two near-identical methods; the second is the one the RE uses. |
| vMix input polling | `packages/playout-gateway/src/vmix/VmixInputPoller.ts` — polls vMix XML API every 5 s into Core mediaObjects. No fetch timeout; change detection keys on `{key,title,type}` only. |
| Caspar patches | `.yarn/patches/` — casparcg-connection `DECKLINK DEVICE` + casparcg-state `STING OVERLAY=` patch files **present but not applied** (not in `resolutions`; see gotcha above). |
| Ingest/playout fixes | `insertPiece` pieces marked `dynamicallyInserted`; timeline regenerated after ingest part changes (`job-worker/src/ingest/syncChangesToPartInstance.ts`). |
| WebUI fixes | Null `tTimers`/missing studio-settings crash, `withTiming` import cycle, `react-router-bootstrap` removal (`useNavigate` crash). |

[Megarepo README → Changes from upstream](../README.md#changes-from-upstream) has the full
merged-PR catalogue.

