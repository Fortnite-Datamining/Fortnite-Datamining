# Fortnite Datamining

> This project is not affiliated with or endorsed by Epic Games

Automated tracking of changes to Fortnite through public API data. Datamining is done by periodically fetching JSON data from [fortnite-api.com](https://fortnite-api.com/) and committing changes to this repository. Git diffs between commits reveal what changed

## How It Works

A [GitHub Actions workflow](.github/workflows/fetch.yml) runs every 30 minutes to fetch data from Fortnite's public APIs. When data changes (new cosmetics, shop rotation, build updates, etc), the differences are committed to this repo. To follow updates you can:

- Read [`CHANGELOG.md`](CHANGELOG.md)
- Browse the [commit history](../../commits/main) for the raw diffs
- Invite the [Discord bot](https://github.com/fortnite-datamining/bot)

## Tracked Data

| Endpoint | File | Description |
|----------|------|-------------|
| `/v2/cosmetics/br` | `data/cosmetics/br.json` | All Battle Royale cosmetics |
| `/v2/shop` | `data/shop/current.json` | Current item shop rotation |
| `/v2/news` | `data/news/current.json` | In-game news (BR, STW, Creative) |
| `/v1/playlists` | `data/playlists/current.json` | Available playlists & gamemodes |
| `/v2/aes` | `data/aes/current.json` | AES encryption keys |
| `/v1/banners` | `data/banners/current.json` | Player banners |
| (derived from `/v2/aes`) | `data/meta/build_info.json` | Extracted build version metadata |

### Derived Data

| File | Description |
|------|-------------|
| `CHANGELOG.md` | Auto-generated timeline of every fetch run that produced changes |
| `data/items/registry.json` | Per-item lifetime data: first seen, metadata, every shop appearance with price |
| `data/shop/history/YYYY-MM-DD.json` | Daily snapshot of the shop, kept forever |
| `data/news/history/YYYY-MM-DD.json` | Daily snapshot of news, kept forever |

## Reading the Data

Browse commit history to see changes:
```bash
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

