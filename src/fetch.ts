import { createHmac } from "crypto";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Endpoint {
  url: string;
  output: string;
  description: string;
  sortKey?: string;
}

const ENDPOINTS: Record<string, Endpoint> = {
  cosmetics_br: {
    url: "https://fortnite-api.com/v2/cosmetics/br",
    output: "data/cosmetics/br.json",
    description: "BR Cosmetics",
    sortKey: "id",
  },
  cosmetics_cars: {
    url: "https://fortnite-api.com/v2/cosmetics/cars",
    output: "data/cosmetics/cars.json",
    description: "Cars",
    sortKey: "id",
  },
  cosmetics_instruments: {
    url: "https://fortnite-api.com/v2/cosmetics/instruments",
    output: "data/cosmetics/instruments.json",
    description: "Instruments",
    sortKey: "id",
  },
  cosmetics_lego: {
    url: "https://fortnite-api.com/v2/cosmetics/lego",
    output: "data/cosmetics/lego.json",
    description: "LEGO Cosmetics",
    sortKey: "id",
  },
  cosmetics_lego_kits: {
    url: "https://fortnite-api.com/v2/cosmetics/lego/kits",
    output: "data/cosmetics/lego_kits.json",
    description: "LEGO Kits",
    sortKey: "id",
  },
  cosmetics_tracks: {
    url: "https://fortnite-api.com/v2/cosmetics/tracks",
    output: "data/cosmetics/tracks.json",
    description: "Jam Tracks",
    sortKey: "id",
  },
  cosmetics_beans: {
    url: "https://fortnite-api.com/v2/cosmetics/beans",
    output: "data/cosmetics/beans.json",
    description: "Beans",
    sortKey: "id",
  },
  shop: {
    url: "https://fortnite-api.com/v2/shop",
    output: "data/shop/current.json",
    description: "Item Shop",
  },
  news: {
    url: "https://fortnite-api.com/v2/news",
    output: "data/news/current.json",
    description: "News",
  },
  playlists: {
    url: "https://fortnite-api.com/v1/playlists",
    output: "data/playlists/current.json",
    description: "Playlists",
    sortKey: "id",
  },
  aes: {
    url: "https://fortnite-api.com/v2/aes",
    output: "data/aes/current.json",
    description: "AES Keys",
  },
  banners: {
    url: "https://fortnite-api.com/v1/banners",
    output: "data/banners/current.json",
    description: "Banners",
    sortKey: "id",
  },
  banner_colors: {
    url: "https://fortnite-api.com/v1/banners/colors",
    output: "data/banners/colors.json",
    description: "Banner Colors",
    sortKey: "id",
  },
};

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  retries = 1,
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Fortnite-Datamining/1.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (attempt < retries) {
        console.log(`  -> Retrying (${err instanceof Error ? err.message : err})...`);
        await sleep(3000);
      } else {
        throw err;
      }
    }
  }
}

function sortArray(data: unknown, key: string): unknown {
  if (!Array.isArray(data)) return data;
  return [...data].sort((a, b) => {
    const aVal = String(a?.[key] ?? "");
    const bVal = String(b?.[key] ?? "");
    return aVal.localeCompare(bVal);
  });
}

function stabilize(data: unknown, sortKey?: string): unknown {
  if (data === null || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    const arr = data.map((item) => stabilize(item, undefined));
    return sortKey ? sortArray(arr, sortKey) : arr;
  }

  const obj = data as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    if (k === "data" && sortKey) {
      sorted[k] = stabilize(obj[k], sortKey);
    } else {
      sorted[k] = stabilize(obj[k], undefined);
    }
  }
  return sorted;
}

function countItems(relPath: string): number {
  const absPath = join(ROOT, relPath);
  if (!existsSync(absPath)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(absPath, "utf-8"));
    if (Array.isArray(parsed?.data)) return parsed.data.length;
  } catch {}
  return 0;
}

function saveJson(data: unknown, relPath: string, sortKey?: string): boolean {
  const absPath = join(ROOT, relPath);
  const dir = dirname(absPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const stabilized = stabilize(data, sortKey);
  const newContent = JSON.stringify(stabilized, null, 2) + "\n";

  if (existsSync(absPath)) {
    const existing = readFileSync(absPath, "utf-8");
    if (existing === newContent) return false;
  }

  writeFileSync(absPath, newContent);
  return true;
}

function extractBuildInfo(aesData: unknown): boolean {
  const obj = aesData as Record<string, unknown>;
  const data = obj?.data as Record<string, unknown> | undefined;
  if (!data) return false;

  const buildInfo = {
    build: data.build ?? null,
    version: data.version ?? null,
  };

  return saveJson(buildInfo, "data/meta/build_info.json");
}

interface ChangeInfo {
  file: string;
  description: string;
  itemsBefore: number;
  itemsAfter: number;
}

function formatCommitMessage(changes: ChangeInfo[]): string {
  const buildChange = changes.find((c) => c.file === "data/meta/build_info.json");
  const buildInfoPath = join(ROOT, "data/meta/build_info.json");

  let title: string;
  if (buildChange && existsSync(buildInfoPath)) {
    const info = JSON.parse(readFileSync(buildInfoPath, "utf-8"));
    title = `Build Update: ${info.build ?? "Unknown"}`;
  } else {
    const descs = [...new Set(changes.map((c) => c.description))];
    title = `Update: ${descs.join(", ")}`;
  }

  const lines: string[] = [];
  for (const c of changes) {
    if (c.file === "data/meta/build_info.json") {
      lines.push(`- ${c.file}`);
      continue;
    }
    const diff = c.itemsAfter - c.itemsBefore;
    if (c.itemsBefore > 0 && diff > 0) {
      lines.push(`- ${c.file} (+${diff} items, ${c.itemsAfter} total)`);
    } else if (c.itemsBefore > 0 && diff < 0) {
      lines.push(`- ${c.file} (${diff} items, ${c.itemsAfter} total)`);
    } else {
      lines.push(`- ${c.file}`);
    }
  }

  return `${title}\n\nTracked changes:\n${lines.join("\n")}`;
}

function gitCommit(changes: ChangeInfo[]): void {
  const isCI = !!process.env.GITHUB_ACTIONS;

  if (isCI) {
    execSync(`git config user.name "fortnite-datamining[bot]"`, { cwd: ROOT });
    execSync(
      `git config user.email "fortnite-datamining[bot]@users.noreply.github.com"`,
      { cwd: ROOT },
    );
  }

  const fullMsg = formatCommitMessage(changes);

  for (const c of changes) {
    execSync(`git add ${c.file}`, { cwd: ROOT });
  }
  execSync(`git commit -m ${JSON.stringify(fullMsg)}`, { cwd: ROOT });
  console.log(`Committed: ${fullMsg.split("\n")[0]}`);
}

async function sendDiscordNotification(changes: ChangeInfo[]): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return;

  const buildInfoPath = join(ROOT, "data/meta/build_info.json");
  const buildChange = changes.find((c) => c.file === "data/meta/build_info.json");

  let title: string;
  if (buildChange && existsSync(buildInfoPath)) {
    const info = JSON.parse(readFileSync(buildInfoPath, "utf-8"));
    title = `Build Update: ${info.build ?? "Unknown"}`;
  } else {
    const descs = [...new Set(changes.map((c) => c.description))];
    title = `Update: ${descs.join(", ")}`;
  }

  const fields = changes
    .filter((c) => c.file !== "data/meta/build_info.json")
    .map((c) => {
      const diff = c.itemsAfter - c.itemsBefore;
      let value = "Content changed";
      if (c.itemsBefore > 0 && diff > 0) value = `+${diff} new (${c.itemsAfter} total)`;
      else if (c.itemsBefore > 0 && diff < 0) value = `${diff} removed (${c.itemsAfter} total)`;
      return { name: c.description, value, inline: true };
    });

  const embed = {
    title,
    color: 0x00b2ff,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "Fortnite Datamining" },
  };

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    console.log("Discord notification sent.");
  } catch (err) {
    console.warn(`Discord webhook failed: ${err instanceof Error ? err.message : err}`);
  }
}

function buildTweetText(changes: ChangeInfo[]): string {
  const buildInfoPath = join(ROOT, "data/meta/build_info.json");
  const buildChange = changes.find((c) => c.file === "data/meta/build_info.json");
  const parts: string[] = [];

  if (buildChange && existsSync(buildInfoPath)) {
    const info = JSON.parse(readFileSync(buildInfoPath, "utf-8"));
    const version = String(info.build ?? "").replace(/\+\+Fortnite\+Release-/, "v").replace(/-CL-.*/, "");
    parts.push(`New Fortnite update detected! (${version})`);
  }

  const cosmetics = changes.filter((c) => c.file.startsWith("data/cosmetics/"));
  const totalNew = cosmetics.reduce((sum, c) => {
    const diff = c.itemsAfter - c.itemsBefore;
    return sum + (diff > 0 ? diff : 0);
  }, 0);
  if (totalNew > 0) {
    parts.push(`${totalNew} new cosmetic${totalNew === 1 ? "" : "s"} added to the files`);
  }

  const shopChange = changes.find((c) => c.description === "Item Shop");
  if (shopChange) parts.push("Item Shop has rotated");

  const newsChange = changes.find((c) => c.description === "News");
  if (newsChange) parts.push("In-game news updated");

  const playlistChange = changes.find((c) => c.description === "Playlists");
  if (playlistChange) parts.push("Playlists/gamemodes changed");

  const aesChange = changes.find((c) => c.description === "AES Keys");
  if (aesChange && !buildChange) parts.push("New AES encryption keys");

  if (parts.length === 0) parts.push("Fortnite data updated");

  return parts.join("\n\n") + "\n\n#Fortnite #FortniteLeaks #FortniteSeason3";
}

function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const baseString =
    method.toUpperCase() +
    "&" +
    encodeURIComponent(url) +
    "&" +
    encodeURIComponent(
      Object.keys(params)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join("&"),
    );
  const signingKey = encodeURIComponent(consumerSecret) + "&" + encodeURIComponent(tokenSecret);
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

async function postTweet(changes: ChangeInfo[]): Promise<void> {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    return;
  }

  const text = buildTweetText(changes);
  if (text.length > 280) {
    console.warn(`Tweet too long (${text.length} chars), truncating...`);
  }

  const url = "https://api.twitter.com/2/tweets";
  const oauthNonce = Math.random().toString(36).substring(2);
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: oauthNonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: oauthTimestamp,
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  const signature = oauthSign("POST", url, oauthParams, TWITTER_API_SECRET, TWITTER_ACCESS_SECRET);
  oauthParams.oauth_signature = signature;

  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(", ");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.slice(0, 280) }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(`Twitter API error (${res.status}): ${body}`);
      return;
    }

    console.log("Tweet posted.");
  } catch (err) {
    console.warn(`Twitter post failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function fetchAll(): Promise<ChangeInfo[]> {
  const changes: ChangeInfo[] = [];
  let successCount = 0;
  const entries = Object.entries(ENDPOINTS);

  // Fetch all endpoints in parallel
  const results = await Promise.allSettled(
    entries.map(async ([name, endpoint]) => {
      console.log(`Fetching ${endpoint.description}...`);
      const data = await fetchWithRetry(endpoint.url);
      return { name, endpoint, data };
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.warn(`  -> Failed: ${result.reason}`);
      continue;
    }

    const { name, endpoint, data } = result.value;
    successCount++;

    const itemsBefore = countItems(endpoint.output);
    const changed = saveJson(data, endpoint.output, endpoint.sortKey);

    if (changed) {
      const itemsAfter = countItems(endpoint.output);
      changes.push({
        file: endpoint.output,
        description: endpoint.description,
        itemsBefore,
        itemsAfter,
      });
      console.log(`  ${endpoint.description} -> Changed`);
    } else {
      console.log(`  ${endpoint.description} -> No changes`);
    }

    if (name === "aes") {
      const buildChanged = extractBuildInfo(data);
      if (buildChanged) {
        changes.push({
          file: "data/meta/build_info.json",
          description: "Build Info",
          itemsBefore: 0,
          itemsAfter: 0,
        });
      }
    }
  }

  if (successCount === 0) {
    console.error("All endpoints failed!");
    process.exit(1);
  }

  return changes;
}

async function main() {
  console.log("Fortnite Datamining - Fetching data...\n");

  const changes = await fetchAll();

  if (changes.length === 0) {
    console.log("\nNo changes detected.");
    return;
  }

  console.log(`\n${changes.length} file(s) changed.`);
  gitCommit(changes);
  await sendDiscordNotification(changes);
  await postTweet(changes);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
