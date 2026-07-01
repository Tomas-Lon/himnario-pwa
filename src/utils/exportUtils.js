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
