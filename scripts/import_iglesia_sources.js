#!/usr/bin/env node
/*
  Importa fuentes de Iglesia a public/data/hymns.json
  Fuentes:
  - DB_Iglesia_01-07-26.json  (letra + títulos base)
  - Canciones_acordes.txt     (progresiones por grados)
  - RevisionCanciones.xlsx    (tonalidad + estilo)
*/

import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'

const ROOT = process.cwd()
const SRC_JSON = path.join(ROOT, 'DB_Iglesia', 'DB_Iglesia_01-07-26.json')
const SRC_TXT = path.join(ROOT, 'DB_Iglesia', 'Canciones_acordes.txt')
const SRC_XLSX_NEW = path.join(ROOT, 'DB_Iglesia', 'RevisionCanciones_01.xlsx')
const SRC_XLSX_OLD = path.join(ROOT, 'DB_Iglesia', 'RevisionCanciones.xlsx')
const OUT_JSON = path.join(ROOT, 'public', 'data', 'hymns.json')

const TITLE_ALIASES = {
  [normalizeTitle('Santo, Santo, Santo; Dicen Los Querubines')]: normalizeTitle('Santo, Santo dicen los querubines'),
  [normalizeTitle('A precio De Sangre')]: normalizeTitle('Aprecio de sangre'),
  [normalizeTitle('Santo, Santo, Santo, eres tu')]: normalizeTitle('Santo, Santo, Santo'),
  [normalizeTitle('Señor Tú Eres, la persona')]: normalizeTitle('Señor Tú eres Precioso para mí'),
  [normalizeTitle('Aleluya Al Señor')]: normalizeTitle('Canta Aleluya'),
}

function normalizeTitle(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function diceCoefficient(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const pairs = new Map()
  for (let i = 0; i < a.length - 1; i++) {
    const p = a.slice(i, i + 2)
    pairs.set(p, (pairs.get(p) ?? 0) + 1)
  }

  let hits = 0
  for (let i = 0; i < b.length - 1; i++) {
    const p = b.slice(i, i + 2)
    const c = pairs.get(p) ?? 0
    if (c > 0) {
      pairs.set(p, c - 1)
      hits++
    }
  }

  return (2 * hits) / ((a.length - 1) + (b.length - 1))
}

function findBestHymnTitleKey(targetNorm, hymnKeys) {
  let best = { key: null, score: 0 }
  let second = { key: null, score: 0 }

  for (const k of hymnKeys) {
    const score = diceCoefficient(targetNorm, k)
    if (score > best.score) {
      second = best
      best = { key: k, score }
    } else if (score > second.score) {
      second = { key: k, score }
    }
  }

  const highConfidence = best.score >= 0.88 && (best.score - second.score) >= 0.05
  return highConfidence ? best.key : null
}

function parseChordTxt(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const map = new Map()

  let currentTitle = null
  let buffer = []

  const flush = () => {
    if (!currentTitle) return
    const body = buffer.join('\n').trim()
    if (body) {
      map.set(normalizeTitle(currentTitle), body)
    }
    currentTitle = null
    buffer = []
  }

  for (const line of lines) {
    const titleMatch = line.match(/^\s*T[íi]tulo\s*:\s*(.+)\s*$/i)
    if (titleMatch) {
      flush()
      currentTitle = titleMatch[1].trim()
      continue
    }

    if (/^={8,}\s*$/.test(line)) {
      flush()
      continue
    }

    if (currentTitle) {
      buffer.push(line)
    }
  }
  flush()

  return map
}

function parseXlsx(filePath) {
  const wb = xlsx.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' })

  const cleanPrefixedTitle = (s) => String(s ?? '')
    .replace(/^\s*\d+\s*[\.)-]\s*/, '')
    .trim()

  const map = new Map()
  for (const row of rows) {
    const title = cleanPrefixedTitle(
      row.HIMNOS || row.TITULO || row.Titulo || row.Title || row.Column1 || '',
    )
    if (!String(title).trim()) continue
    const key = String(row.NOTA ?? row.Column2 ?? '').trim()
    const style = String(row.ESTILO ?? row.Column3 ?? '').trim()
    const normalized = normalizeTitle(title)
    const canonical = TITLE_ALIASES[normalized] ?? normalized

    map.set(canonical, {
      key: key || null,
      style: style || null,
    })
  }

  return { rows, map }
}

function main() {
  const srcXlsx = fs.existsSync(SRC_XLSX_NEW) ? SRC_XLSX_NEW : SRC_XLSX_OLD
  const raw = JSON.parse(fs.readFileSync(SRC_JSON, 'utf8'))
  const chordMap = parseChordTxt(SRC_TXT)
  const { rows: xlsxRows, map: xlsxMap } = parseXlsx(srcXlsx)

  const baseRows = raw.filter((x) => x && (x.title || x?.lyrics?.full_text))

  const hymnByNorm = new Map()
  for (const x of baseRows) {
    hymnByNorm.set(normalizeTitle(String(x.title ?? '').trim()), x)
  }
  const hymnKeys = [...hymnByNorm.keys()]

  const xlsxResolved = new Map()
  let xlsxExactMatches = 0
  let xlsxFuzzyMatches = 0
  for (const [k, v] of xlsxMap.entries()) {
    if (hymnByNorm.has(k)) {
      xlsxResolved.set(k, v)
      xlsxExactMatches++
      continue
    }
    const guess = findBestHymnTitleKey(k, hymnKeys)
    if (guess) {
      xlsxResolved.set(guess, v)
      xlsxFuzzyMatches++
    }
  }

  const data = baseRows.map((x, i) => {
    const title = String(x.title ?? '').trim()
    const keyNorm = normalizeTitle(title)
    const extra = xlsxResolved.get(keyNorm)
    const progression = chordMap.get(keyNorm) ?? null

    const style = extra?.style ?? null
    const fallbackKey = String(x.key ?? '').trim()
    const key = extra?.key ?? (fallbackKey || null)

    return {
      id: Number(x.id) || (i + 1),
      numero: i + 1,
      title,
      lyrics: String(x?.lyrics?.full_text ?? '').trim(),
      category: style,
      style,
      musical_key: key,
      musical_notation: progression,
      note: null,
    }
  })

  const version = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 14)
  const payload = {
    version,
    data,
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8')

  const withKey = data.filter((d) => d.musical_key).length
  const withStyle = data.filter((d) => d.style).length
  const withChords = data.filter((d) => d.musical_notation).length

  console.log(`Base rows: ${data.length}`)
  console.log(`XLSX source: ${path.basename(srcXlsx)}`)
  console.log(`XLSX rows: ${xlsxRows.length}`)
  console.log(`XLSX match exact: ${xlsxExactMatches}`)
  console.log(`XLSX match fuzzy: ${xlsxFuzzyMatches}`)
  console.log(`Con tonalidad: ${withKey}`)
  console.log(`Con estilo: ${withStyle}`)
  console.log(`Con progresion: ${withChords}`)
  console.log(`Sin progresion: ${data.length - withChords}`)
  console.log(`Salida: ${OUT_JSON}`)
}

main()
