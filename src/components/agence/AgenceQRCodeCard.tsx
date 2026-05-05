/**
 * Phase 16.1 — Carte QR Code agence (branding orange/rouge).
 *
 * Génère un QR via api.qrserver.com (pas de dépendance npm). Permet :
 *   - téléchargement PNG haute résolution (canvas) avec header BRH + footer agence
 *   - fallback direct download si CORS bloque le canvas
 */
import { Download, QrCode } from 'lucide-react'

interface AgenceQRCodeCardProps {
  url: string
  label: string
}

export default function AgenceQRCodeCard({ url, label }: AgenceQRCodeCardProps) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${encodeURIComponent(url)}`

  function handleDownload() {
    const canvas = document.createElement('canvas')
    const padding = 28
    const qrSize = 400
    const headerHeight = 56
    const footerHeight = 70
    canvas.width = qrSize + padding * 2
    canvas.height = qrSize + headerHeight + footerHeight + padding * 2

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const grad = ctx.createLinearGradient(0, 0, canvas.width, headerHeight)
    grad.addColorStop(0, '#f97316') // orange-500
    grad.addColorStop(1, '#dc2626') // red-600
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, headerHeight)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('BRH Habitat', canvas.width / 2, 36)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, padding, headerHeight + padding, qrSize, qrSize)

      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, canvas.width / 2, headerHeight + padding + qrSize + 28)

      ctx.fillStyle = '#64748b'
      ctx.font = '12px sans-serif'
      const display = url.length > 56 ? url.slice(0, 53) + '...' : url
      ctx.fillText(display, canvas.width / 2, headerHeight + padding + qrSize + 50)

      canvas.toBlob((blob) => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `qrcode-brh-${label.toLowerCase().replace(/\s+/g, '-')}.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')
    }
    img.onerror = () => {
      const a = document.createElement('a')
      a.href = qrSrc
      a.download = `qrcode-brh-${label.toLowerCase().replace(/\s+/g, '-')}.png`
      a.target = '_blank'
      a.click()
    }
    img.src = qrSrc
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-4">
      <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 p-2 rounded-2xl border-4 border-orange-500">
        <img
          src={qrSrc}
          alt={`QR Code ${label}`}
          width={280}
          height={280}
          className="rounded-lg block"
          loading="lazy"
        />
      </div>

      <div className="text-center max-w-full">
        <div className="flex items-center justify-center gap-2 mb-1">
          <QrCode size={14} className="text-orange-600" />
          <p className="font-display text-sm uppercase tracking-wide text-slate-800">{label}</p>
        </div>
        <p className="text-[11px] text-slate-400 break-all">{url}</p>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl shadow-md shadow-orange-500/20 hover:-translate-y-0.5 transition-all"
      >
        <Download size={14} />
        Télécharger PNG
      </button>
    </div>
  )
}
