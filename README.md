# History snapshots

Daily snapshots of the item shop and in-game news, written by the
[fetch workflow](https://github.com/Fortnite-Datamining/Fortnite-Datamining/blob/main/.github/workflows/fetch.yml)
on the `main` branch. Kept on this orphan branch so `main` stays small and
shallow-clone friendly.

| Directory | Contents |
|-----------|----------|
| `shop/YYYY-MM-DD.json` | Last state of the item shop for that UTC day |
| `news/YYYY-MM-DD.json` | Last state of in-game news for that UTC day |

Fetch a single snapshot without cloning:

```
https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/history/shop/2026-06-10.json
```
