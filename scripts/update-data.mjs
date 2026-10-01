#!/usr/bin/env node
// Fetches public Fortnite data from fortnite-api.com and writes
// repo snapshots into ./data so Dropzone can serve them statically.
//
// Usage:
//   node scripts/update-data.mjs            # full refresh
//   node scripts/update-data.mjs --only=news,map
//
// No API key is required for the endpoints used below.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'data');
const API  = 'https://fortnite-api.com/v2';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v = true] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const ONLY = args.only ? String(args.only).split(',').map(s => s.trim()) : null;
const shouldRun = key => !ONLY || ONLY.includes(key);

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'dropzone-data-bot' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function writeJson(relPath, data) {
  const full = resolve(ROOT, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const bytes = Buffer.byteLength(JSON.stringify(data));
  console.log(`  ✓ ${relPath}  (${(bytes / 1024).toFixed(1)} KB)`);
}

async function readJsonIfExists(relPath) {
  try {
    return JSON.parse(await readFile(resolve(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

// --- Individual jobs ---------------------------------------------------------

async function updateNews() {
  console.log('→ news');
  const json = await fetchJson(`${API}/news`);
  await writeJson('news/current.json', json);
}

async function updateMap() {
  console.log('→ map');
  const json = await fetchJson(`${API}/map`);
  await writeJson('map/current.json', json);
}

async function updatePlaylists() {
  console.log('→ playlists');
  const json = await fetchJson(`${API}/playlists`);
  await writeJson('playlists/current.json', json);
}

async function updateBuild() {
  console.log('→ build info');
  const aes = await fetchJson(`${API}/aes`);
  const build =
    aes?.data?.build ||
    aes?.data?.builds?.[0]?.build ||
    'unknown build';
  await writeJson('meta/build_info.json', {
    build,
    fetchedAt: new Date().toISOString(),
  });
}

async function updateBanners() {
  console.log('→ banners');
  const json = await fetchJson(`${API}/cosmetics/banners`);
  await writeJson('banners/current.json', json);
}

async function updateStats() {
  console.log('→ aggregate stats');
  const [br, lego, tracks, instruments, cars, beans] = await Promise.all([
    fetchJson(`${API}/cosmetics/br`).catch(() => null),
    fetchJson(`${API}/cosmetics/lego`).catch(() => null),
    fetchJson(`${API}/cosmetics/tracks`).catch(() => null),
    fetchJson(`${API}/cosmetics/instruments`).catch(() => null),
    fetchJson(`${API}/cosmetics/cars`).catch(() => null),
    fetchJson(`${API}/cosmetics/beans`).catch(() => null),
  ]);
  const count = j => (Array.isArray(j?.data) ? j.data.length : 0);
  const playlists = await readJsonIfExists('playlists/current.json');
  await writeJson('meta/stats.json', {
    generatedAt: new Date().toISOString(),
    counts: {
      'BR Cosmetics':   count(br),
      'LEGO Cosmetics': count(lego),
      'Jam Tracks':     count(tracks),
      'Instruments':    count(instruments),
      'Cars':           count(cars),
      'Beans':          count(beans),
      'Playlists':      count(playlists) || undefined,
    },
  });
}

async function updateWeapons() {
  console.log('→ weapons (repo snapshot only)');
  const existing = await readJsonIfExists('weapons/current.json');
  if (!existing) {
    await writeJson('weapons/current.json', {
      generatedAt: new Date().toISOString(),
      weapons: [],
      note: 'Weapons have no public Fortnite-API endpoint. Populate from your own extractor.',
    });
  } else {
    existing.generatedAt = new Date().toISOString();
    await writeJson('weapons/current.json', existing);
  }
}

// --- Runner ------------------------------------------------------------------

const JOBS = {
  news:      updateNews,
  map:       updateMap,
  playlists: updatePlaylists,
  build:     updateBuild,
  banners:   updateBanners,
  stats:     updateStats,
  weapons:   updateWeapons,
};

async function main() {
  console.log('Dropzone data refresh —', new Date().toISOString());
  const failures = [];
  for (const [key, job] of Object.entries(JOBS)) {
    if (!shouldRun(key)) { console.log(`↷ skipping ${key}`); continue; }
    try { await job(); }
    catch (err) { failures.push({ key, message: err.message }); console.error(`  ✗ ${key}: ${err.message}`); }
  }
  if (failures.length) {
    console.error(`\n${failures.length} job(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll snapshots refreshed.');
  }
}

main();
