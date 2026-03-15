# Fortnite Datamining

Automated tracking of changes to Fortnite through public API data. Datamining is done by periodically fetching JSON data from [fortnite-api.com](https://fortnite-api.com/) and committing changes to this repository — **git diffs between commits reveal what changed.**

> **Note:** This project is not affiliated with or endorsed by Epic Games. It is purely for educational and informational purposes.

## How It Works

A [GitHub Actions workflow](.github/workflows/fetch.yml) runs every 30 minutes to fetch data from Fortnite's public APIs. When data changes (new cosmetics, shop rotation, build updates, etc.), the differences are committed to this repo. You can browse the [commit history](../../commits/main) to see exactly what changed and when.

## Tracked Data

| Endpoint | File | Description |
|----------|------|-------------|
| `/v2/cosmetics/br` | `data/cosmetics/br.json` | All Battle Royale cosmetics |
| `/v2/shop` | `data/shop/current.json` | Current item shop rotation |
| `/v2/news` | `data/news/current.json` | In-game news (BR, STW, Creative) |
| `/v2/playlists` | `data/playlists/current.json` | Available playlists & gamemodes |
| `/v2/aes` | `data/aes/current.json` | AES encryption keys |
| `/v1/banners` | `data/banners/current.json` | Player banners |
| — | `data/meta/build_info.json` | Extracted build version metadata |

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

## Credits

Data sourced from [fortnite-api.com](https://fortnite-api.com/).
