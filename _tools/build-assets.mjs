// Builds every generated file under img/, fonts/ and the favicons from _sources/.
// Run: cd _tools && npm install && node build-assets.mjs [--map]
// --map re-downloads the OpenStreetMap tiles; leave it off unless the location changes.
import sharp from "sharp";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (f) => path.join(root, "_sources", f);
const out = (f) => path.join(root, f);

// Studio door, Skala, Patmos (from the original Google Maps pin 37°19'21.6"N 26°32'37.2"E)
export const STUDIO = { lat: 37.322667, lon: 26.543667 };

const BLUE = "#24607a";

// Archimedean spiral, after the iron spiral above the studio door
export function spiralPath({ turns = 3, steps = 120, radius = 19 } = {}) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = t * turns * 2 * Math.PI, r = t * radius;
    d += (i ? "L" : "M") + (r * Math.cos(a)).toFixed(1) + " " + (r * Math.sin(a)).toFixed(1);
  }
  return d;
}

async function variants(input, name, widths, { aspect, position = "attention" } = {}) {
  for (const w of widths) {
    let img = sharp(input).rotate();
    img = aspect ? img.resize(w, Math.round(w / aspect), { fit: "cover", position }) : img.resize({ width: w, withoutEnlargement: true });
    await img.clone().avif({ quality: 50 }).toFile(out(`img/${name}-${w}.avif`));
    await img.clone().webp({ quality: 74 }).toFile(out(`img/${name}-${w}.webp`));
    await img.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(out(`img/${name}-${w}.jpg`));
  }
}

async function images() {
  await variants(src("studio-facade.png"), "studio", [480, 760, 976]);
  await variants(src("areti.jpg"), "areti", [320, 560], { aspect: 1 });
  for (const n of ["reflexology", "face-massage", "sound-massage", "meditation"]) {
    await variants(src(`${n}.jpg`), n, [360, 640], { aspect: 4 / 5 });
  }
  // "attention" crops this one to the face; centre keeps the hands on the shoulders
  await variants(src("massage.jpg"), "massage", [360, 640], { aspect: 4 / 5, position: "centre" });
  // Link preview (Open Graph): 1200x630, cropped on the doorway
  await sharp(src("studio-facade.png"))
    .resize(1200, 630, { fit: "cover", position: "south" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out("img/og-studio.jpg"));
}

async function icons() {
  const d = spiralPath({ turns: 2.6, steps: 90, radius: 18 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -24 48 48"><style>path{stroke:${BLUE}}@media (prefers-color-scheme:dark){path{stroke:#8cc7de}}</style><path d="${d}" fill="none" stroke-width="4.2" stroke-linecap="round"/></svg>\n`;
  await writeFile(out("favicon.svg"), svg);
  // Raster icons sit on a limewash tile so they read on any background
  const tile = (size) => Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-24 -24 48 48"><rect x="-24" y="-24" width="48" height="48" rx="${size >= 64 ? 0 : 8}" fill="#f6f5f1"/><path d="${d}" fill="none" stroke="${BLUE}" stroke-width="4.2" stroke-linecap="round" transform="scale(.82)"/></svg>`);
  await sharp(tile(180)).png().toFile(out("apple-touch-icon.png"));
  await sharp(tile(512)).png().toFile(out("img/icon-512.png"));
  // favicon.ico: a single 32px PNG wrapped in an ICO container
  const png = await sharp(tile(32)).png().toBuffer();
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  await writeFile(out("favicon.ico"), Buffer.concat([head, png]));
}

async function fonts() {
  await mkdir(out("fonts"), { recursive: true });
  const dir = path.join(root, "_tools/node_modules/@fontsource-variable/source-sans-3/files");
  for (const sub of ["latin", "greek"]) {
    await copyFile(path.join(dir, `source-sans-3-${sub}-wght-normal.woff2`), out(`fonts/source-sans-3-${sub}.woff2`));
  }
}

// Static map from OpenStreetMap tiles (© OpenStreetMap contributors, ODbL), with a marker on the studio
async function map() {
  const z = 17, W = 1600, H = 1000, T = 256;
  const n = 2 ** z;
  const px = ((STUDIO.lon + 180) / 360) * n * T;
  const lat = (STUDIO.lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n * T;
  const left = Math.round(px - W / 2), top = Math.round(py - H / 2);
  const tiles = [];
  for (let ty = Math.floor(top / T); ty <= Math.floor((top + H - 1) / T); ty++) {
    for (let tx = Math.floor(left / T); tx <= Math.floor((left + W - 1) / T); tx++) {
      const res = await fetch(`https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`, {
        headers: { "User-Agent": "aretichatzi.com static map build (one-off; github.com/cdrqnts)" },
      });
      if (!res.ok) throw new Error(`tile ${tx}/${ty}: ${res.status}`);
      tiles.push({ input: Buffer.from(await res.arrayBuffer()), left: tx * T - left, top: ty * T - top });
    }
  }
  const pin = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g transform="translate(${W / 2} ${H / 2})"><circle r="34" fill="${BLUE}" fill-opacity=".18"/><circle r="17" fill="#f2d813" stroke="${BLUE}" stroke-width="6"/></g></svg>`);
  const canvasW = W + 2 * T, canvasH = H + 2 * T;
  const base = await sharp({ create: { width: canvasW, height: canvasH, channels: 3, background: "#f2efe9" } })
    .composite(tiles.map((t) => ({ ...t, left: t.left + T, top: t.top + T })))
    .png().toBuffer();
  const cropped = await sharp(base).extract({ left: T, top: T, width: W, height: H }).composite([{ input: pin }]).png().toBuffer();
  await writeFile(src("map-skala.png"), cropped);
}

async function mapVariants() {
  for (const w of [800, 1600]) {
    const img = sharp(src("map-skala.png")).resize({ width: w });
    await img.clone().avif({ quality: 55 }).toFile(out(`img/map-skala-${w}.avif`));
    await img.clone().webp({ quality: 78 }).toFile(out(`img/map-skala-${w}.webp`));
    await img.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(out(`img/map-skala-${w}.jpg`));
  }
}

await mkdir(out("img"), { recursive: true });
if (process.argv.includes("--map")) await map();
await Promise.all([images(), icons(), fonts()]);
await mapVariants();
console.log("assets built");
