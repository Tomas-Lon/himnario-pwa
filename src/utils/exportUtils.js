import jsPDF from 'jspdf'

/**
 * Comparte un himno usando Web Share API (nativo en iOS Safari).
 * Si no está disponible, copia al portapapeles.
 */
async function tryShare(title, text) {
  // 1. Web Share API — nativo iOS/Android (requiere HTTPS o localhost)
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled' // usuario cerró el sheet
      // NotAllowedError u otro → intentar clipboard
    }
  }
  // 2. Clipboard API — requiere HTTPS
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return 'clipboard'
    } catch {
      // HTTP sin permiso → fallback a execCommand
    }
  }
  // 3. execCommand — funciona en HTTP (deprecated pero universal)
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) return 'clipboard'
  } catch { /* nada */ }
  return 'error'
}

export async function shareHymn(hymn) {
  const text = [
    `Nº ${hymn.numero ?? 'S/N'} — ${hymn.title ?? ''}`,
    '─'.repeat(30),
    hymn.lyrics ?? '',
  ].join('\n')
  return tryShare(hymn.title, text)
}

export async function shareHymnWithChords(hymn, transposedChords) {
  const text = [
    `Nº ${hymn.numero ?? 'S/N'} — ${hymn.title ?? ''}`,
    `Tonalidad: ${hymn.musical_key ?? ''}`,
    '─'.repeat(30),
    transposedChords ?? hymn.musical_notation ?? '',
    '',
    hymn.lyrics ?? '',
  ].join('\n')
  return tryShare(hymn.title, text)
}

/**
 * Exporta un himno como PDF y lo descarga / abre en iOS.
 */
export function exportHymnAsPdf(hymn) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const maxW = pageW - margin * 2
  let y = 60

  // Título
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Nº ${hymn.numero ?? 'S/N'}`, margin, y)
  y += 26

  doc.setFontSize(14)
  const titleLines = doc.splitTextToSize(hymn.title ?? '', maxW)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 20 + 10

  // Separador
  doc.setDrawColor(180)
  doc.line(margin, y, pageW - margin, y)
  y += 16

  // Letra
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const lyricsLines = doc.splitTextToSize(hymn.lyrics ?? '', maxW)

  for (const line of lyricsLines) {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      y = 60
    }
    doc.text(line, margin, y)
    y += 15
  }

  const filename = `himno-${hymn.numero ?? hymn.id}.pdf`
  doc.save(filename)
}

/**
 * Exporta un himno con acordes transpuestos como PDF.
 */
export function exportHymnWithChordsPdf(hymn, transposedChords) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const maxW = pageW - margin * 2
  let y = 60

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Nº ${hymn.numero ?? 'S/N'}`, margin, y)
  y += 26

  doc.setFontSize(14)
  const titleLines = doc.splitTextToSize(hymn.title ?? '', maxW)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 20 + 6

  if (hymn.musical_key) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.text(`Tonalidad: ${hymn.musical_key}`, margin, y)
    y += 18
  }

  doc.setDrawColor(180)
  doc.line(margin, y, pageW - margin, y)
  y += 16

  // Acordes (monoespaciado)
  if (transposedChords) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(10)
    const chordLines = transposedChords.split('\n')
    for (const line of chordLines) {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60 }
      doc.text(line, margin, y)
      y += 14
    }
    y += 8
  }

  // Letra
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const lyricsLines = doc.splitTextToSize(hymn.lyrics ?? '', maxW)
  for (const line of lyricsLines) {
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60 }
    doc.text(line, margin, y)
    y += 15
  }

  doc.save(`himno-${hymn.numero ?? hymn.id}-acordes.pdf`)
}

/* ─────────────────────────────────────────────────────────────
   Exportar lista completa
───────────────────────────────────────────────────────────────*/

function addListHeader(doc, lista, hymns, margin) {
  const pageW = doc.internal.pageSize.getWidth()
  let y = 60
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text(lista.nombre ?? 'Lista', margin, y)
  y += 28
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`${hymns.length} himno${hymns.length !== 1 ? 's' : ''}`, margin, y)
  y += 18
  doc.setTextColor(0)
  doc.setDrawColor(180)
  doc.line(margin, y, pageW - margin, y)
  y += 20
  return y
}

/** Lista: solo numeración y títulos */
export function exportListAsPdf(lista, hymns) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  let y = addListHeader(doc, lista, hymns, margin)

  doc.setFontSize(11)
  hymns.forEach((h, i) => {
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60 }
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}.`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nº ${h.numero ?? h.id} — ${h.title ?? ''}`, margin + 22, y)
    y += 18
  })

  const safeName = (lista.nombre ?? 'lista').replace(/[^a-z0-9\-_áéíóúüñ]/gi, '_')
  doc.save(`${safeName}.pdf`)
}

/** Lista: títulos + letra */
export function exportListWithLyricsPdf(lista, hymns) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const maxW = pageW - margin * 2
  let y = addListHeader(doc, lista, hymns, margin)

  for (const h of hymns) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 60 }
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    const titleLines = doc.splitTextToSize(`Nº ${h.numero ?? h.id} — ${h.title ?? ''}`, maxW)
    doc.text(titleLines, margin, y)
    y += titleLines.length * 18 + 4
    doc.setDrawColor(210)
    doc.line(margin, y, pageW - margin, y)
    y += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lyricsLines = doc.splitTextToSize(h.lyrics ?? '', maxW)
    for (const line of lyricsLines) {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60 }
      doc.text(line, margin, y)
      y += 14
    }
    y += 18
  }

  const safeName = (lista.nombre ?? 'lista').replace(/[^a-z0-9\-_áéíóúüñ]/gi, '_')
  doc.save(`${safeName}-letra.pdf`)
}

/** Lista: títulos + notas/acordes + letra */
export function exportListWithChordsPdf(lista, hymns) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const maxW = pageW - margin * 2
  let y = addListHeader(doc, lista, hymns, margin)

  for (const h of hymns) {
    if (y > doc.internal.pageSize.getHeight() - 100) { doc.addPage(); y = 60 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    const titleLines = doc.splitTextToSize(`Nº ${h.numero ?? h.id} — ${h.title ?? ''}`, maxW)
    doc.text(titleLines, margin, y)
    y += titleLines.length * 18 + 2

    if (h.musical_key) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(80)
      doc.text(`Tonalidad: ${h.musical_key}`, margin, y)
      y += 14
      doc.setTextColor(0)
    }

    doc.setDrawColor(210)
    doc.line(margin, y, pageW - margin, y)
    y += 12

    if (h.musical_notation) {
      doc.setFont('courier', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 70, 160)
      for (const line of h.musical_notation.split('\n')) {
        if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60 }
        doc.text(line, margin, y)
        y += 13
      }
      doc.setTextColor(0)
      y += 6
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0)
    const lyricsLines = doc.splitTextToSize(h.lyrics ?? '', maxW)
    for (const line of lyricsLines) {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 60 }
      doc.text(line, margin, y)
      y += 14
    }
    y += 18
  }

  const safeName = (lista.nombre ?? 'lista').replace(/[^a-z0-9\-_áéíóúüñ]/gi, '_')
  doc.save(`${safeName}-notas.pdf`)
}
