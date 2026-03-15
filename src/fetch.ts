import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");

interface Endpoint {
  url: string;
  output: string;
  description: string;
  sortKey?: string; // key to sort array items by (for stable diffs)
}

const ENDPOINTS: Record<string, Endpoint> = {
  cosmetics_br: {
    url: "https://fortnite-api.com/v2/cosmetics/br",
    output: "data/cosmetics/br.json",
    description: "BR Cosmetics",
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
    url: "https://fortnite-api.com/v2/playlists",
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
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchEndpoint(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Fortnite-Datamining/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
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
  // Sort object keys and recurse
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    // Sort the top-level data array if it has a sortKey
    if (k === "data" && sortKey) {
      sorted[k] = stabilize(obj[k], sortKey);
    } else {
      sorted[k] = stabilize(obj[k], undefined);
    }
  }
  return sorted;
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
    updated: new Date().toISOString(),
  };

  return saveJson(buildInfo, "data/meta/build_info.json");
}

function gitCommit(changedFiles: string[], descriptions: string[]): void {
  const isCI = !!process.env.GITHUB_ACTIONS;

  if (isCI) {
    execSync(
      `git config user.name "fortnite-datamining[bot]"`,
      { cwd: ROOT },
    );
    execSync(
      `git config user.email "fortnite-datamining[bot]@users.noreply.github.com"`,
      { cwd: ROOT },
    );
  }

  // Check if there's a build version change
  let commitMsg: string;
  const buildInfoPath = join(ROOT, "data/meta/build_info.json");
  const hasBuildChange = changedFiles.includes("data/meta/build_info.json");

  if (hasBuildChange && existsSync(buildInfoPath)) {
    const info = JSON.parse(readFileSync(buildInfoPath, "utf-8"));
    commitMsg = `Build Update: ${info.build ?? "Unknown"}`;
  } else {
    commitMsg = `Update: ${descriptions.join(", ")}`;
  }

  const details = changedFiles.map((f) => `- ${f}`).join("\n");
  const fullMsg = `${commitMsg}\n\nTracked changes:\n${details}`;

  for (const f of changedFiles) {
    execSync(`git add ${f}`, { cwd: ROOT });
  }
  execSync(`git commit -m ${JSON.stringify(fullMsg)}`, { cwd: ROOT });
  console.log(`Committed: ${commitMsg}`);
}

async function fetchAll(): Promise<{
  changedFiles: string[];
  descriptions: string[];
}> {
  const changedFiles: string[] = [];
  const descriptions: string[] = [];
  let successCount = 0;

  for (const [name, endpoint] of Object.entries(ENDPOINTS)) {
    try {
      console.log(`Fetching ${endpoint.description}...`);
      const data = await fetchEndpoint(endpoint.url);

      const changed = saveJson(data, endpoint.output, endpoint.sortKey);
      if (changed) {
        changedFiles.push(endpoint.output);
        descriptions.push(endpoint.description);
        console.log(`  -> Changed`);
      } else {
        console.log(`  -> No changes`);
      }

      // Extract build info from AES data
      if (name === "aes") {
        const buildChanged = extractBuildInfo(data);
        if (buildChanged) {
          changedFiles.push("data/meta/build_info.json");
        }
      }

      successCount++;
    } catch (err) {
      console.warn(
        `  -> Failed: ${err instanceof Error ? err.message : err}`,
      );
    }

    await sleep(2000);
  }

  if (successCount === 0) {
    console.error("All endpoints failed!");
    process.exit(1);
  }

  return { changedFiles, descriptions };
}

async function main() {
  console.log("Fortnite Datamining - Fetching data...\n");

  const { changedFiles, descriptions } = await fetchAll();

  if (changedFiles.length === 0) {
    console.log("\nNo changes detected.");
    return;
  }

  console.log(`\n${changedFiles.length} file(s) changed.`);
  gitCommit(changedFiles, descriptions);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
