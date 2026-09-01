# Fortnite Datamining

[![Fetch](https://github.com/Fortnite-Datamining/Fortnite-Datamining/actions/workflows/fetch.yml/badge.svg)](https://github.com/Fortnite-Datamining/Fortnite-Datamining/actions/workflows/fetch.yml)
[![CI](https://github.com/Fortnite-Datamining/Fortnite-Datamining/actions/workflows/ci.yml/badge.svg)](https://github.com/Fortnite-Datamining/Fortnite-Datamining/actions/workflows/ci.yml)
[![Last update](https://img.shields.io/github/last-commit/Fortnite-Datamining/Fortnite-Datamining/main?label=last%20update)](https://github.com/Fortnite-Datamining/Fortnite-Datamining/commits/main)

> This project is not affiliated with or endorsed by Epic Games

Automated tracking of changes to Fortnite through public API data. Datamining is done by periodically fetching JSON data from [fortnite-api.com](https://fortnite-api.com/) and Epic's public content API, and committing changes to this repository. Git diffs between commits reveal what changed

## How It Works

A [GitHub Actions workflow](.github/workflows/fetch.yml) runs every 30 minutes to fetch data from Fortnite's public APIs. When data changes (new cosmetics, shop rotation, build updates, etc), the differences are committed to this repo. To follow updates you can:

- Read [`CHANGELOG.md`](CHANGELOG.md)
- Subscribe to the [RSS feed](https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/main/feed.xml)
- Browse the [commit history](../../commits/main) for the raw diffs
- Invite the [Discord bot](https://github.com/fortnite-datamining/bot)

## Current Stats

<!-- stats:start -->
Current build: `++Fortnite+Release-42.00-CL-56878558`

| Category | Items |
|----------|-------|
| BR Cosmetics | 16,182 |
| Cars | 1,643 |
| Instruments | 300 |
| LEGO Cosmetics | 2,470 |
| LEGO Kits | 449 |
| Jam Tracks | 712 |
| Beans | 1,748 |
| Banners | 1,005 |
| Playlists | 776 |
<!-- stats:end -->

## Tracked Data

| Endpoint | File | Description |
|----------|------|-------------|
| `/v2/cosmetics/br` | `data/cosmetics/br.json` | All Battle Royale cosmetics |
| `/v2/shop` | `data/shop/current.json` | Current item shop rotation |
| `/v2/news` | `data/news/current.json` | In-game news (BR, STW, Creative) |
| `/v1/playlists` | `data/playlists/current.json` | Available playlists & gamemodes |
| `/v2/aes` | `data/aes/current.json` | AES encryption keys |
| `/v1/banners` | `data/banners/current.json` | Player banners |
| `/v1/map` | `data/map/current.json` | Map & points of interest |
| Epic content API | `data/epic/content.json` | Event screens, MOTDs & content pages straight from Epic |
| (derived from `/v2/aes`) | `data/meta/build_info.json` | Extracted build version metadata |

## Derived Data

| File | Description |
|------|-------------|
| `CHANGELOG.md` | Auto-generated timeline of every fetch run that produced changes (older months under [`changelog/`](changelog/)) |
| `feed.xml` | RSS feed of the changelog |
| `data/items/registry.json` | Per-item lifetime data: first seen, metadata, every shop appearance with price |
| `data/meta/stats.json` | Current item counts and build version |
| [`history` branch](../../tree/history) | Daily snapshots of the shop and news, kept forever |

Daily snapshots live on the orphan [`history`](../../tree/history) branch so `main` stays small and fast to clone

## Reading the Data

Fetch any file raw, no clone needed:

```bash
curl -s https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/main/data/shop/current.json

# a specific day's shop from the history branch
curl -s https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/history/shop/2026-06-10.json
```

Browse commit history to see changes:

```bash
# shallow clone is enough for current state
git clone --depth 1 https://github.com/Fortnite-Datamining/Fortnite-Datamining.git

# All changes
git log --oneline

# Changes to a specific category
git log --oneline -- data/shop/current.json

# See what changed in a specific commit
git show <commit-hash>

# Diff between two points in time
git diff HEAD~5 -- data/cosmetics/br.json
```

## Running Locally

```bash
npm install
npm run fetch
```

Without `GITHUB_ACTIONS` set, the script commits locally but never pushes, and notification secrets (`DISCORD_WEBHOOK_URL`, `TWITTER_*`) are optional
