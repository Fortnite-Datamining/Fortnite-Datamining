/**
 * Phase 2 Stub: Extract game assets using AES keys from Phase 1 data.
 *
 * This will eventually:
 * 1. Read AES keys from data/aes/current.json
 * 2. Locate Fortnite .pak/.ucas files
 * 3. Decrypt and extract assets
 * 4. Export to trackable formats
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function getAesKeys(): { build: string; mainKey: string; dynamicKeys: string[] } {
  const raw = readFileSync(join(ROOT, "data/aes/current.json"), "utf-8");
  const { data } = JSON.parse(raw);
  return {
    build: data.build,
    mainKey: data.mainKey,
    dynamicKeys: (data.dynamicKeys ?? []).map((k: { pakFilename: string; key: string }) => k.key),
  };
}

function extractPakFile(_path: string, _key: string): void {
  throw new Error("Not implemented — requires CUE4Parse or similar library");
}

// Entry point
const keys = getAesKeys();
console.log(`Build: ${keys.build}`);
console.log(`Main AES Key: ${keys.mainKey}`);
console.log(`Dynamic Keys: ${keys.dynamicKeys.length}`);
console.log("\nAsset extraction not yet implemented. See phase2/README.md");
