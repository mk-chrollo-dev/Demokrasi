import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dir, '../public/assets')
const SCALE = 4  // each logical pixel = 4×4 real pixels

function out(path) { return resolve(PUBLIC, path) }

function render(grid, filePath) {
  const H = grid.length, W = grid[0].length
  const canvas = createCanvas(W * SCALE, H * SCALE)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!grid[y][x]) continue
      ctx.fillStyle = grid[y][x]
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
    }
  }
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, canvas.toBuffer())
  console.log('✓', filePath.replace(resolve(__dir, '..') + '/', ''))
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function mkgrid(w, h, fill = null) { return Array.from({length: h}, () => new Array(w).fill(fill)) }
function px(g, x, y, c) { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c }
function rect(g, x1, y1, x2, y2, c) { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) px(g, x, y, c) }
function hline(g, y, x1, x2, c) { for (let x = x1; x <= x2; x++) px(g, x, y, c) }
function vline(g, x, y1, y2, c) { for (let y = y1; y <= y2; y++) px(g, x, y, c) }
function oval(g, cx, cy, rx, ry, c) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++)
    if ((x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1) g[y][x] = c
}
function border(g, x1, y1, x2, y2, t, c) {
  for (let i = 0; i < t; i++) {
    hline(g, y1 + i, x1, x2, c); hline(g, y2 - i, x1, x2, c)
    vline(g, x1 + i, y1, y2, c); vline(g, x2 - i, y1, y2, c)
  }
}
function diag(g, x, y, dx, dy, len, c) {
  for (let i = 0; i < len; i++) px(g, x + i * dx, y + i * dy, c)
}

// ── Color palette ────────────────────────────────────────────────────────────

const C = {
  skin: '#C68642', skd: '#A0522D', skh: '#D4956A',
  sno_cap: '#1A1A1A', sno_srt: '#8B0000', sno_acc: '#FFD700',
  har_cap: '#4A5240', har_srt: '#3A3A2A', har_acc: '#8B6914', har_bdg: '#FFD700',
  meg_hr: '#1A0A00', meg_srt: '#C8102E',
  pra_brt: '#1A1A2E', pra_srt: '#2C3E50', pra_acc: '#C8102E',
  jkw_srt: '#1E88E5',
  gold: '#FFD700', wht: '#FFFFFF', blk: '#0A0A1A',
  red: '#C0392B', green: '#27AE60', blue: '#2980B9',
  gray: '#7F8C8D', purple: '#8E44AD', dpurple: '#4A0E8F',
  fr_sno: '#6B0000', fr_har: '#2A3020', fr_meg: '#8B0A1E',
  fr_pra: '#0D1117', fr_jkw: '#0D3B7A',
  asp_eko: '#27AE60', asp_kes: '#E74C3C', asp_kea: '#2980B9',
  asp_pen: '#F39C12', asp_inf: '#7F8C8D',
  dkbg: '#0A0A1A', dkbg2: '#0D0D22', dkbg3: '#080818',
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. President Portraits (32×32)
// ══════════════════════════════════════════════════════════════════════════════

function makeSoekarno() {
  const g = mkgrid(32, 32)
  // Red shirt body
  oval(g, 16, 29, 11, 5, C.sno_srt)
  rect(g, 7, 24, 24, 29, C.sno_srt)
  // White collar
  rect(g, 13, 19, 18, 22, C.wht)
  // Face
  oval(g, 16, 13, 7, 9, C.skin)
  // Peci (black flat-top cap)
  rect(g, 9, 3, 22, 9, C.sno_cap)
  hline(g, 3, 11, 20, C.sno_cap) // flat top
  // Gold star on cap
  px(g, 16, 6, C.gold)
  px(g, 15, 7, C.gold)
  px(g, 17, 7, C.gold)
  px(g, 14, 7, C.gold)
  px(g, 18, 7, C.gold)
  px(g, 16, 5, C.gold)
  px(g, 16, 8, C.gold)
  // Eyes
  px(g, 13, 12, C.blk); px(g, 14, 12, C.blk)
  px(g, 18, 12, C.blk); px(g, 19, 12, C.blk)
  // Eyebrows
  hline(g, 11, 13, 14, C.skd)
  hline(g, 11, 17, 19, C.skd)
  // Nose
  px(g, 16, 14, C.skd)
  px(g, 15, 15, C.skd); px(g, 17, 15, C.skd)
  // Mouth (slight smile)
  hline(g, 17, 14, 17, C.skd)
  px(g, 13, 17, C.skd); px(g, 19, 17, C.skd)
  // Skin highlight on forehead
  px(g, 16, 10, C.skh)
  return g
}

function makeSoeharto() {
  const g = mkgrid(32, 32)
  // Dark shirt
  oval(g, 16, 29, 11, 5, C.har_srt)
  rect(g, 7, 24, 24, 29, C.har_srt)
  // Collar
  rect(g, 13, 20, 18, 23, C.har_srt)
  // Gold epaulettes
  rect(g, 7, 23, 10, 24, C.har_bdg)
  rect(g, 21, 23, 25, 24, C.har_bdg)
  // Face
  oval(g, 16, 13, 7, 9, C.skin)
  // Military cap body
  rect(g, 8, 4, 23, 8, C.har_cap)
  // Wide brim
  hline(g, 9, 5, 26, C.har_cap)
  hline(g, 10, 6, 25, C.har_cap)
  // Gold badge on cap
  rect(g, 14, 5, 17, 7, C.har_bdg)
  px(g, 15, 6, C.gold); px(g, 16, 6, C.gold)
  // Stern eyes (flat lines)
  hline(g, 12, 13, 14, C.blk)
  hline(g, 12, 18, 19, C.blk)
  // Heavy brows
  hline(g, 11, 12, 15, C.skd)
  hline(g, 11, 17, 20, C.skd)
  // Nose
  px(g, 16, 14, C.skd)
  px(g, 15, 15, C.skd); px(g, 17, 15, C.skd)
  // Straight mouth
  hline(g, 17, 14, 17, C.skd)
  return g
}

function makeMegawati() {
  const g = mkgrid(32, 32)
  // Red shirt
  oval(g, 16, 29, 11, 5, C.meg_srt)
  rect(g, 7, 24, 24, 29, C.meg_srt)
  // White collar
  rect(g, 13, 19, 18, 22, C.wht)
  // Dark hair (behind face)
  oval(g, 16, 9, 9, 8, C.meg_hr)
  // Side hair flowing down
  vline(g, 8, 8, 20, C.meg_hr)
  vline(g, 7, 10, 20, C.meg_hr)
  vline(g, 23, 8, 20, C.meg_hr)
  vline(g, 24, 10, 20, C.meg_hr)
  // Face (drawn after hair so it overlaps)
  oval(g, 16, 13, 7, 9, C.skin)
  // Gold earrings
  px(g, 9, 15, C.gold); px(g, 10, 15, C.gold)
  px(g, 22, 15, C.gold); px(g, 23, 15, C.gold)
  // Eyes
  px(g, 13, 12, C.blk); px(g, 14, 12, C.blk)
  px(g, 18, 12, C.blk); px(g, 19, 12, C.blk)
  // Eyebrows (arched)
  hline(g, 11, 13, 14, C.meg_hr)
  hline(g, 11, 17, 19, C.meg_hr)
  // Nose
  px(g, 16, 14, C.skd)
  px(g, 15, 15, C.skd); px(g, 17, 15, C.skd)
  // Smile
  hline(g, 17, 14, 17, C.skd)
  px(g, 13, 17, C.skd); px(g, 19, 17, C.skd)
  // Hair highlight
  px(g, 14, 5, C.meg_hr); px(g, 18, 5, C.meg_hr)
  return g
}

function makePrabowo() {
  const g = mkgrid(32, 32)
  // Dark navy uniform
  oval(g, 16, 29, 11, 5, C.pra_srt)
  rect(g, 7, 24, 24, 29, C.pra_srt)
  // Collar
  rect(g, 13, 20, 18, 23, C.pra_srt)
  // Dark navy beret (wider left = tilted effect)
  oval(g, 16, 7, 10, 4, C.pra_brt)
  rect(g, 8, 8, 24, 10, C.pra_brt)
  // Tilt effect: left side 1px lower
  px(g, 8, 9, C.pra_brt); px(g, 9, 9, C.pra_brt)
  px(g, 7, 9, C.pra_brt); px(g, 7, 10, C.pra_brt)
  // Beret band
  hline(g, 11, 8, 24, C.blk)
  // Red star on beret left
  px(g, 11, 7, C.pra_acc)
  px(g, 12, 6, C.pra_acc)
  px(g, 12, 8, C.pra_acc)
  px(g, 10, 7, C.pra_acc)
  px(g, 13, 7, C.pra_acc)
  // Face (slightly wider)
  oval(g, 16, 13, 8, 9, C.skin)
  // Strong jaw
  hline(g, 18, 12, 20, C.skin)
  // Eyes
  px(g, 13, 12, C.blk); px(g, 14, 12, C.blk)
  px(g, 18, 12, C.blk); px(g, 19, 12, C.blk)
  // Heavy brows
  hline(g, 11, 12, 15, C.skd)
  hline(g, 11, 17, 20, C.skd)
  // Nose
  px(g, 16, 14, C.skd)
  px(g, 15, 15, C.skd); px(g, 17, 15, C.skd)
  // Serious mouth
  hline(g, 17, 14, 18, C.skd)
  return g
}

function makeJokowi() {
  const jkw_hr = '#2C1A0A'
  const g = mkgrid(32, 32)
  // Blue shirt
  oval(g, 16, 29, 11, 5, C.jkw_srt)
  rect(g, 7, 24, 24, 29, C.jkw_srt)
  // Collar / white undershirt
  rect(g, 13, 19, 18, 22, C.wht)
  // Hair
  rect(g, 10, 4, 21, 7, jkw_hr)
  oval(g, 16, 6, 7, 4, jkw_hr)
  // Face
  oval(g, 16, 13, 8, 9, C.skin)
  // Ears
  vline(g, 8, 13, 15, C.skin)
  vline(g, 9, 12, 15, C.skin)
  vline(g, 23, 13, 15, C.skin)
  vline(g, 22, 12, 15, C.skin)
  // Eyes
  px(g, 13, 12, C.blk); px(g, 14, 12, C.blk)
  px(g, 18, 12, C.blk); px(g, 19, 12, C.blk)
  // Eyebrows
  hline(g, 11, 13, 14, jkw_hr)
  hline(g, 11, 17, 19, jkw_hr)
  // Nose
  px(g, 16, 14, C.skd)
  px(g, 15, 15, C.skd); px(g, 17, 15, C.skd)
  // Wide smile
  hline(g, 17, 13, 19, C.skd)
  // Dimples
  px(g, 12, 16, C.skd); px(g, 20, 16, C.skd)
  // Smile arc
  px(g, 13, 18, C.skd); px(g, 19, 18, C.skd)
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Card Frames (60×84)
// ══════════════════════════════════════════════════════════════════════════════

function makeFrame(bg, borderC, header) {
  const g = mkgrid(60, 84)
  rect(g, 0, 0, 59, 83, bg)
  border(g, 0, 0, 59, 83, 2, borderC)
  rect(g, 0, 0, 59, 18, header)
  rect(g, 0, 67, 59, 83, C.blk)
  border(g, 4, 4, 55, 79, 1, borderC)
  // Corner dots 2×2 gold
  rect(g, 2, 2, 3, 3, C.gold)
  rect(g, 56, 2, 57, 3, C.gold)
  rect(g, 2, 80, 3, 81, C.gold)
  rect(g, 56, 80, 57, 81, C.gold)
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Card Back (60×84)
// ══════════════════════════════════════════════════════════════════════════════

function makeCardBack() {
  const g = mkgrid(60, 84)
  // Diagonal stripe pattern per-pixel formula
  for (let y = 0; y < 84; y++) {
    for (let x = 0; x < 60; x++) {
      const mod = (x + y) % 6
      if (mod < 2) g[y][x] = C.gold
      else if (mod < 4) g[y][x] = '#3B0000'
      else g[y][x] = C.blk
    }
  }
  // Gold border 2px
  border(g, 0, 0, 59, 83, 2, C.gold)
  // Center diamond at (30,42) size 8
  for (let y = 0; y < 84; y++) {
    for (let x = 0; x < 60; x++) {
      if (Math.abs(x - 30) + Math.abs(y - 42) <= 6) g[y][x] = C.gold
    }
  }
  px(g, 30, 42, C.blk)
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Icons (16×16)
// ══════════════════════════════════════════════════════════════════════════════

function makeIconSpeech() {
  const g = mkgrid(16, 16)
  // Speech bubble background
  rect(g, 2, 2, 13, 10, '#1A3A6C')
  // Clear corners for rounded effect
  px(g, 2, 2, null); px(g, 13, 2, null)
  px(g, 2, 10, null); px(g, 13, 10, null)
  // Tail
  px(g, 4, 11, '#1A3A6C')
  px(g, 3, 12, '#1A3A6C')
  px(g, 2, 13, '#1A3A6C')
  // White horizontal lines inside (text)
  hline(g, 5, 4, 11, C.wht)
  hline(g, 7, 4, 11, C.wht)
  hline(g, 9, 4, 9, C.wht)
  // Border 1px blue
  border(g, 2, 2, 13, 10, 1, '#3A5A9C')
  return g
}

function makeIconMoney() {
  const g = mkgrid(16, 16)
  // 3 stacked coins
  oval(g, 8, 12, 5, 2, '#8B6914')
  oval(g, 8, 9, 5, 2, C.gold)
  oval(g, 8, 6, 5, 2, C.gold)
  // Dollar sign on top coin
  vline(g, 8, 4, 8, '#8B6914')
  hline(g, 5, 6, 10, '#8B6914')
  hline(g, 7, 6, 10, '#8B6914')
  return g
}

function makeIconRoad() {
  const g = mkgrid(16, 16)
  // Green land strips
  rect(g, 0, 0, 4, 15, '#27AE60')
  rect(g, 11, 0, 15, 15, '#27AE60')
  // Gray road center
  rect(g, 5, 0, 10, 15, C.gray)
  // White dashes
  hline(g, 4, 6, 9, C.wht)
  hline(g, 7, 6, 9, C.wht)
  hline(g, 10, 6, 9, C.wht)
  return g
}

function makeIconCrowd() {
  const g = mkgrid(16, 16)
  // Left figure
  oval(g, 3, 4, 2, 2, C.wht)
  rect(g, 2, 6, 4, 10, C.wht)
  // Center figure (1px taller)
  oval(g, 8, 3, 2, 2, C.wht)
  rect(g, 6, 5, 9, 11, C.wht)
  // Right figure
  oval(g, 13, 4, 2, 2, C.wht)
  rect(g, 12, 6, 14, 10, C.wht)
  return g
}

function makeIconNewspaper() {
  const g = mkgrid(16, 16)
  // Newspaper body
  rect(g, 2, 2, 13, 13, '#ECF0F1')
  // Headline bar
  rect(g, 2, 2, 13, 4, '#888888')
  // Text lines
  hline(g, 6, 3, 12, '#555555')
  hline(g, 8, 3, 12, '#555555')
  hline(g, 10, 3, 12, '#555555')
  // Fold corner (clear top-right corner pixels)
  px(g, 13, 2, null); px(g, 13, 3, null); px(g, 12, 2, null)
  // Fold triangle in bg
  px(g, 13, 2, '#AAAAAA'); px(g, 13, 3, '#CCCCCC'); px(g, 12, 2, '#CCCCCC')
  return g
}

function makeIconHandshake() {
  const g = mkgrid(16, 16)
  // Clasped center
  rect(g, 5, 6, 10, 10, C.skd)
  // Left hand
  rect(g, 1, 7, 6, 9, C.skin)
  // Right hand
  rect(g, 9, 7, 14, 9, C.skin)
  // Fingers top
  hline(g, 6, 5, 10, C.skin)
  hline(g, 5, 6, 9, C.skin)
  return g
}

function makeIconBuilding() {
  const g = mkgrid(16, 16)
  // Building body
  rect(g, 3, 5, 12, 13, C.gray)
  // Windows (gold lit)
  rect(g, 4, 6, 5, 7, C.gold)
  rect(g, 7, 6, 8, 7, C.gold)
  rect(g, 10, 6, 11, 7, C.gold)
  rect(g, 4, 9, 5, 10, C.gold)
  rect(g, 10, 9, 11, 10, C.gold)
  // Door
  rect(g, 6, 11, 9, 13, '#333333')
  // Roof
  hline(g, 4, 3, 12, C.gray)
  hline(g, 3, 5, 10, C.gray)
  // Chimney
  vline(g, 9, 2, 4, C.gray)
  return g
}

function makeIconStar() {
  const g = mkgrid(16, 16)
  // 5-point star centered at (8,8) radius 6 inner 2.5
  const cx = 7.5, cy = 7.5
  const outerR = 6, innerR = 2.5
  // Build polygon points
  const pts = []
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI / 5) - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  // Fill: per-pixel point-in-polygon test
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      // ray casting
      let inside = false
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1]
        const xj = pts[j][0], yj = pts[j][1]
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if (intersect) inside = !inside
      }
      if (inside) g[y][x] = C.gold
    }
  }
  return g
}

function makeIconShield() {
  const g = mkgrid(16, 16)
  // Shield body
  rect(g, 3, 2, 12, 11, C.blue)
  oval(g, 7, 6, 5, 5, C.blue)
  // Bottom V point
  for (let y = 10; y <= 14; y++) {
    const w = 14 - y
    for (let x = 7 - w; x <= 7 + w; x++) px(g, x, y, C.blue)
  }
  // Lighter inner fill
  rect(g, 4, 3, 11, 10, '#3498DB')
  oval(g, 7, 6, 4, 4, '#3498DB')
  // Inner V
  for (let y = 10; y <= 13; y++) {
    const w = 13 - y
    for (let x = 7 - w; x <= 7 + w; x++) px(g, x, y, '#3498DB')
  }
  // Cross
  hline(g, 6, 5, 11, '#5DADE2')
  vline(g, 7, 3, 10, '#5DADE2')
  vline(g, 8, 3, 10, '#5DADE2')
  return g
}

function makeIconLightning() {
  const g = mkgrid(16, 16)
  // Yellow lightning bolt zigzag
  // Top right portion (10,1 -> 7,7)
  diag(g, 10, 1, -1, 2, 3, C.gold)
  diag(g, 11, 1, -1, 2, 3, C.gold)
  // Middle bridge
  hline(g, 7, 7, 9, C.gold)
  hline(g, 7, 7, 9, C.gold)
  // Bottom left portion (9,7 -> 5,14)
  diag(g, 9, 7, -1, 2, 4, C.gold)
  diag(g, 10, 7, -1, 2, 4, C.gold)
  // Extra thickness
  diag(g, 9, 1, -1, 2, 3, C.gold)
  diag(g, 8, 7, -1, 2, 4, C.gold)
  hline(g, 1, 9, 12, C.gold)
  hline(g, 14, 4, 7, C.gold)
  return g
}

function makeIconSword() {
  const g = mkgrid(16, 16)
  // Blade (vertical, 2px wide)
  vline(g, 7, 1, 10, '#BDC3C7')
  vline(g, 8, 1, 10, '#BDC3C7')
  // Blade tip
  px(g, 7, 11, '#BDC3C7')
  // Guard (horizontal)
  hline(g, 11, 4, 11, '#BDC3C7')
  hline(g, 12, 4, 11, '#9AA4A8')
  // Handle (2px wide)
  vline(g, 7, 12, 14, '#7D5A1E')
  vline(g, 8, 12, 14, '#7D5A1E')
  // Pommel
  rect(g, 6, 14, 9, 15, '#8B6914')
  return g
}

function makeIconHeart() {
  const g = mkgrid(16, 16)
  // Two top ovals
  oval(g, 5, 5, 4, 3, C.red)
  oval(g, 11, 5, 4, 3, C.red)
  // Middle connect
  rect(g, 3, 5, 13, 8, C.red)
  // V-bottom narrowing to point
  for (let y = 8; y <= 13; y++) {
    const w = Math.round((13 - y) * 5 / 5)
    const cx2 = 8
    for (let x = cx2 - w; x <= cx2 + w; x++) px(g, x, y, C.red)
  }
  px(g, 8, 14, C.red)
  return g
}

function makeIconBook() {
  const g = mkgrid(16, 16)
  // Left page
  rect(g, 2, 3, 7, 13, '#ECF0F1')
  // Right page
  rect(g, 8, 3, 13, 13, '#F0E8D0')
  // Spine
  vline(g, 7, 3, 13, '#8B6914')
  vline(g, 8, 3, 13, '#8B6914')
  // Lines left page
  hline(g, 5, 3, 6, '#AAAAAA')
  hline(g, 7, 3, 6, '#AAAAAA')
  hline(g, 9, 3, 6, '#AAAAAA')
  hline(g, 11, 3, 6, '#AAAAAA')
  // Lines right page
  hline(g, 5, 9, 12, '#BBBBAA')
  hline(g, 7, 9, 12, '#BBBBAA')
  hline(g, 9, 9, 12, '#BBBBAA')
  hline(g, 11, 9, 12, '#BBBBAA')
  // Cover top edge
  hline(g, 2, 2, 13, '#8B6914')
  hline(g, 14, 2, 13, '#8B6914')
  return g
}

function makeIconGear() {
  const g = mkgrid(16, 16)
  // Main circle
  oval(g, 8, 8, 5, 5, C.gray)
  // 8 teeth around perimeter
  hline(g, 1, 7, 9, C.gray) // N
  hline(g, 2, 7, 9, C.gray)
  hline(g, 13, 7, 9, C.gray) // S
  hline(g, 14, 7, 9, C.gray)
  vline(g, 1, 7, 9, C.gray) // W
  vline(g, 2, 7, 9, C.gray)
  vline(g, 13, 7, 9, C.gray) // E
  vline(g, 14, 7, 9, C.gray)
  // Diagonal teeth NE/NW/SE/SW
  px(g, 11, 3, C.gray); px(g, 12, 3, C.gray); px(g, 11, 4, C.gray); px(g, 12, 4, C.gray)
  px(g, 4, 3, C.gray); px(g, 3, 3, C.gray); px(g, 4, 4, C.gray); px(g, 3, 4, C.gray)
  px(g, 11, 12, C.gray); px(g, 12, 12, C.gray); px(g, 11, 11, C.gray); px(g, 12, 11, C.gray)
  px(g, 4, 12, C.gray); px(g, 3, 12, C.gray); px(g, 4, 11, C.gray); px(g, 3, 11, C.gray)
  // Center hole
  oval(g, 8, 8, 2, 2, C.blk)
  return g
}

function makeIconChart() {
  const g = mkgrid(16, 16)
  // Three bars
  rect(g, 2, 10, 4, 13, '#1A7A40')
  rect(g, 6, 7, 8, 13, '#27AE60')
  rect(g, 10, 4, 12, 13, '#2ECC71')
  // Base line
  hline(g, 13, 1, 14, '#555555')
  hline(g, 14, 1, 14, '#555555')
  return g
}

function makeIconSkull() {
  const g = mkgrid(16, 16)
  // Skull head
  oval(g, 8, 7, 6, 6, '#ECF0F1')
  // Eye sockets
  oval(g, 5, 7, 2, 2, C.blk)
  oval(g, 11, 7, 2, 2, C.blk)
  // Nose (small triangle)
  px(g, 8, 9, C.blk)
  px(g, 7, 10, C.blk); px(g, 9, 10, C.blk)
  // Jaw area
  rect(g, 4, 11, 12, 13, '#ECF0F1')
  // Teeth alternating
  hline(g, 12, 4, 12, '#ECF0F1')
  px(g, 5, 13, C.blk); px(g, 7, 13, C.blk)
  px(g, 9, 13, C.blk); px(g, 11, 13, C.blk)
  return g
}

function makeIconEnvelope() {
  const g = mkgrid(16, 16)
  // Envelope body
  rect(g, 2, 3, 13, 12, '#ECF0F1')
  // V flap lines from top corners to center
  for (let i = 0; i <= 6; i++) {
    px(g, 2 + i, 3 + i, '#AAAAAA')
    px(g, 13 - i, 3 + i, '#AAAAAA')
  }
  // Sealed flap line
  hline(g, 8, 2, 13, '#CCCCCC')
  // Red wax seal
  oval(g, 8, 9, 2, 2, C.red)
  return g
}

function makeIconFlag() {
  const g = mkgrid(16, 16)
  // Pole (2px wide)
  vline(g, 2, 2, 13, C.gray)
  vline(g, 3, 2, 13, C.gray)
  // Flag body
  rect(g, 4, 2, 12, 7, '#ECF0F1')
  // Top half red (Indonesian Merah Putih style)
  rect(g, 4, 2, 12, 4, '#C8102E')
  // Small flag ripple effect
  px(g, 12, 3, '#F0C0C0')
  px(g, 12, 5, '#E0E0E0')
  return g
}

function makeIconClock() {
  const g = mkgrid(16, 16)
  // Clock face (light)
  oval(g, 8, 8, 6, 6, '#ECF0F1')
  // Clock inner face (dark)
  oval(g, 8, 8, 5, 5, '#0D1840')
  // Tick marks
  px(g, 8, 3, C.wht) // top
  px(g, 8, 13, C.wht) // bottom
  px(g, 3, 8, C.wht) // left
  px(g, 13, 8, C.wht) // right
  // Diagonal ticks
  px(g, 5, 4, C.wht); px(g, 11, 4, C.wht)
  px(g, 4, 11, C.wht); px(g, 12, 11, C.wht)
  // Hour hand (pointing up-left)
  diag(g, 8, 8, -1, -2, 3, '#FFFFFF')
  // Minute hand (pointing up-right)
  diag(g, 8, 8, 1, -2, 3, '#CCCCCC')
  // Center dot
  px(g, 8, 8, C.gold)
  return g
}

function makeIconBroom() {
  const g = mkgrid(16, 16)
  // Handle diagonal (top-right to bottom-left)
  for (let i = 0; i < 11; i++) {
    px(g, 12 - i, 1 + i, '#8B6914')
    px(g, 11 - i, 1 + i, '#A0763A')
  }
  // Bristles fan from (2,12) spreading downward
  hline(g, 12, 1, 6, '#BDC3C7')
  hline(g, 13, 0, 7, '#BDC3C7')
  hline(g, 14, 0, 8, '#AAAAAA')
  hline(g, 15, 0, 9, '#AAAAAA')
  // Bristle ends
  for (let x = 0; x <= 6; x++) px(g, x, 12, '#999999')
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Aspect icons (16×16) - recolored versions
// ══════════════════════════════════════════════════════════════════════════════

function makeAspectEkonomi() {
  const g = mkgrid(16, 16)
  // Chart with asp_eko colors
  rect(g, 2, 10, 4, 13, '#1A6530')
  rect(g, 6, 7, 8, 13, C.asp_eko)
  rect(g, 10, 4, 12, 13, '#4ADE90')
  hline(g, 13, 1, 14, '#555555')
  hline(g, 14, 1, 14, '#555555')
  return g
}

function makeAspectKesehatan() {
  const g = mkgrid(16, 16)
  // Heart with asp_kes color
  oval(g, 5, 5, 4, 3, C.asp_kes)
  oval(g, 11, 5, 4, 3, C.asp_kes)
  rect(g, 3, 5, 13, 8, C.asp_kes)
  for (let y = 8; y <= 13; y++) {
    const w = Math.round((13 - y) * 5 / 5)
    for (let x = 8 - w; x <= 8 + w; x++) px(g, x, y, C.asp_kes)
  }
  px(g, 8, 14, C.asp_kes)
  return g
}

function makeAspectKeamanan() {
  const g = mkgrid(16, 16)
  // Shield with asp_kea color
  rect(g, 3, 2, 12, 11, C.asp_kea)
  oval(g, 7, 6, 5, 5, C.asp_kea)
  for (let y = 10; y <= 14; y++) {
    const w = 14 - y
    for (let x = 7 - w; x <= 7 + w; x++) px(g, x, y, C.asp_kea)
  }
  // Lighter inner
  const lighter = '#5DADE2'
  rect(g, 4, 3, 11, 10, lighter)
  oval(g, 7, 6, 4, 4, lighter)
  for (let y = 10; y <= 13; y++) {
    const w = 13 - y
    for (let x = 7 - w; x <= 7 + w; x++) px(g, x, y, lighter)
  }
  // Cross
  hline(g, 6, 5, 11, C.wht)
  vline(g, 7, 3, 10, C.wht)
  vline(g, 8, 3, 10, C.wht)
  return g
}

function makeAspectPendidikan() {
  const g = mkgrid(16, 16)
  // Book with asp_pen color
  rect(g, 2, 3, 7, 13, '#FCF3CF')
  rect(g, 8, 3, 13, 13, '#FEF9E7')
  vline(g, 7, 3, 13, C.asp_pen)
  vline(g, 8, 3, 13, C.asp_pen)
  hline(g, 5, 3, 6, '#CCAA44')
  hline(g, 7, 3, 6, '#CCAA44')
  hline(g, 9, 3, 6, '#CCAA44')
  hline(g, 5, 9, 12, '#DDBB55')
  hline(g, 7, 9, 12, '#DDBB55')
  hline(g, 9, 9, 12, '#DDBB55')
  hline(g, 2, 2, 13, C.asp_pen)
  hline(g, 14, 2, 13, C.asp_pen)
  return g
}

function makeAspectInfra() {
  const g = mkgrid(16, 16)
  // Gear with asp_inf color
  oval(g, 8, 8, 5, 5, C.asp_inf)
  hline(g, 1, 7, 9, C.asp_inf)
  hline(g, 2, 7, 9, C.asp_inf)
  hline(g, 13, 7, 9, C.asp_inf)
  hline(g, 14, 7, 9, C.asp_inf)
  vline(g, 1, 7, 9, C.asp_inf)
  vline(g, 2, 7, 9, C.asp_inf)
  vline(g, 13, 7, 9, C.asp_inf)
  vline(g, 14, 7, 9, C.asp_inf)
  px(g, 11, 3, C.asp_inf); px(g, 12, 3, C.asp_inf); px(g, 11, 4, C.asp_inf); px(g, 12, 4, C.asp_inf)
  px(g, 4, 3, C.asp_inf); px(g, 3, 3, C.asp_inf); px(g, 4, 4, C.asp_inf); px(g, 3, 4, C.asp_inf)
  px(g, 11, 12, C.asp_inf); px(g, 12, 12, C.asp_inf); px(g, 11, 11, C.asp_inf); px(g, 12, 11, C.asp_inf)
  px(g, 4, 12, C.asp_inf); px(g, 3, 12, C.asp_inf); px(g, 4, 11, C.asp_inf); px(g, 3, 11, C.asp_inf)
  oval(g, 8, 8, 2, 2, C.blk)
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. FP Slot (16×16) - purple skull with question mark
// ══════════════════════════════════════════════════════════════════════════════

function makeFPSlot() {
  const purple = '#9B59B6'
  const g = mkgrid(16, 16)
  // Skull outline in purple
  oval(g, 8, 7, 6, 6, purple)
  // Eye sockets
  oval(g, 5, 7, 2, 2, C.blk)
  oval(g, 11, 7, 2, 2, C.blk)
  // Nose
  px(g, 8, 9, C.blk)
  // Jaw
  rect(g, 4, 11, 12, 13, purple)
  px(g, 5, 13, C.blk); px(g, 7, 13, C.blk)
  px(g, 9, 13, C.blk); px(g, 11, 13, C.blk)
  // Question mark overlay (right side center)
  px(g, 10, 6, C.wht); px(g, 11, 6, C.wht)
  px(g, 12, 7, C.wht)
  px(g, 11, 8, C.wht)
  px(g, 11, 9, C.wht)
  px(g, 11, 11, C.wht)
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. Background tile (16×16)
// ══════════════════════════════════════════════════════════════════════════════

function makeBgTile() {
  const g = mkgrid(16, 16)
  // Base fill
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let c = C.dkbg
      if (x % 4 === 0 && y % 4 === 0) c = C.dkbg2
      if ((x + y) % 8 === 0) c = C.dkbg3
      g[y][x] = c
    }
  }
  // Seamless: copy top row to bottom, left col to right
  for (let x = 0; x < 16; x++) g[15][x] = g[0][x]
  for (let y = 0; y < 16; y++) g[y][15] = g[y][0]
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. UI Elements
// ══════════════════════════════════════════════════════════════════════════════

function makeBtnNormal() {
  const g = mkgrid(80, 24)
  rect(g, 0, 0, 79, 23, '#1A1A2E')
  border(g, 0, 0, 79, 23, 1, C.gold)
  px(g, 1, 1, C.wht); px(g, 2, 1, C.wht); px(g, 1, 2, C.wht)
  return g
}

function makeBtnHover() {
  const g = mkgrid(80, 24)
  rect(g, 0, 0, 79, 23, '#2A2A4E')
  border(g, 0, 0, 79, 23, 1, C.gold)
  return g
}

function makeBtnDanger() {
  const g = mkgrid(80, 24)
  rect(g, 0, 0, 79, 23, '#5C0000')
  border(g, 0, 0, 79, 23, 1, '#E74C3C')
  return g
}

function makePipActive() {
  const g = mkgrid(8, 8)
  oval(g, 4, 4, 3, 3, C.gold)
  return g
}

function makePipEmpty() {
  const g = mkgrid(8, 8)
  border(g, 0, 0, 7, 7, 1, '#2C2C2C')
  return g
}

function makePipDone() {
  const g = mkgrid(8, 8)
  oval(g, 4, 4, 3, 3, '#1A5C1A')
  return g
}

function makeTickerBg() {
  const g = mkgrid(4, 36)
  rect(g, 0, 0, 3, 35, C.blk)
  hline(g, 35, 0, 3, '#1A1A3A')
  return g
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — generate all 44 assets
// ══════════════════════════════════════════════════════════════════════════════

// 1. President portraits (5)
render(makeSoekarno(), out('presidents/soekarno.png'))
render(makeSoeharto(), out('presidents/soeharto.png'))
render(makeMegawati(), out('presidents/megawati.png'))
render(makePrabowo(), out('presidents/prabowo.png'))
render(makeJokowi(),  out('presidents/jokowi.png'))

// 2. Card frames (5)
render(makeFrame(C.fr_sno, C.sno_acc, '#4A0000'),  out('frames/frame_soekarno.png'))
render(makeFrame(C.fr_har, C.har_bdg, '#1A2010'),  out('frames/frame_soeharto.png'))
render(makeFrame(C.fr_meg, '#E74C3C',  '#5C0012'),  out('frames/frame_megawati.png'))
render(makeFrame(C.fr_pra, '#3498DB',  '#080C10'),  out('frames/frame_prabowo.png'))
render(makeFrame(C.fr_jkw, '#5DADE2',  '#082050'),  out('frames/frame_jokowi.png'))

// 3. Card back (1)
render(makeCardBack(), out('card-back.png'))

// 4. Icons (20)
render(makeIconSpeech(),     out('icons/icon_speech.png'))
render(makeIconMoney(),      out('icons/icon_money.png'))
render(makeIconRoad(),       out('icons/icon_road.png'))
render(makeIconCrowd(),      out('icons/icon_crowd.png'))
render(makeIconNewspaper(),  out('icons/icon_newspaper.png'))
render(makeIconHandshake(),  out('icons/icon_handshake.png'))
render(makeIconBuilding(),   out('icons/icon_building.png'))
render(makeIconStar(),       out('icons/icon_star.png'))
render(makeIconShield(),     out('icons/icon_shield.png'))
render(makeIconLightning(),  out('icons/icon_lightning.png'))
render(makeIconSword(),      out('icons/icon_sword.png'))
render(makeIconHeart(),      out('icons/icon_heart.png'))
render(makeIconBook(),       out('icons/icon_book.png'))
render(makeIconGear(),       out('icons/icon_gear.png'))
render(makeIconChart(),      out('icons/icon_chart.png'))
render(makeIconSkull(),      out('icons/icon_skull.png'))
render(makeIconEnvelope(),   out('icons/icon_envelope.png'))
render(makeIconFlag(),       out('icons/icon_flag.png'))
render(makeIconClock(),      out('icons/icon_clock.png'))
render(makeIconBroom(),      out('icons/icon_broom.png'))

// 5. Aspect icons (5)
render(makeAspectEkonomi(),    out('aspects/ekonomi.png'))
render(makeAspectKesehatan(),  out('aspects/kesehatan.png'))
render(makeAspectKeamanan(),   out('aspects/keamanan.png'))
render(makeAspectPendidikan(), out('aspects/pendidikan.png'))
render(makeAspectInfra(),      out('aspects/infra.png'))

// 6. FP slot (1)
render(makeFPSlot(), out('fp-slot.png'))

// 7. Background tile (1)
render(makeBgTile(), out('bg-tile.png'))

// 8. UI elements (7)
render(makeBtnNormal(), out('ui/btn-normal.png'))
render(makeBtnHover(),  out('ui/btn-hover.png'))
render(makeBtnDanger(), out('ui/btn-danger.png'))
render(makePipActive(), out('ui/pip-active.png'))
render(makePipEmpty(),  out('ui/pip-empty.png'))
render(makePipDone(),   out('ui/pip-done.png'))
render(makeTickerBg(),  out('ui/ticker-bg.png'))

// Total: 5 + 5 + 1 + 20 + 5 + 1 + 1 + 7 = 45... wait let me recount:
// portraits(5) + frames(5) + card-back(1) + icons(20) + aspects(5) + fp-slot(1) + bg-tile(1) + ui(7) = 45
// The spec says 44 — ticker-bg is listed separately so it's part of UI (7 UI items = btn-normal, btn-hover, btn-danger, pip-active, pip-empty, pip-done, ticker-bg)
// 5+5+1+20+5+1+1+7 = 45... but spec says 44. Let's check: icons are 20, that matches. UI: 6 listed + ticker = 7.
// Spec count: 5+5+1+20+5+1+1+6=44 (ticker-bg as 6th UI or ticker makes 7). Count render() calls above = 45.
// To match 44, we emit the final count correctly as actual calls:
console.log('\n✓ 45 assets generated')
