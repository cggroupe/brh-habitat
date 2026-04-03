import { Download, QrCode } from 'lucide-react'

interface QRCodeDownloadProps {
  url: string
  companyName: string
}

export default function QRCodeDownload({ url, companyName }: QRCodeDownloadProps) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`

  function handleDownload() {
    const canvas = document.createElement('canvas')
    const padding = 24
    const qrSize = 300
    const headerHeight = 48
    const footerHeight = 56
    canvas.width = qrSize + padding * 2
    canvas.height = qrSize + headerHeight + footerHeight + padding * 2

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Green header bar
    ctx.fillStyle = '#359932'
    ctx.fillRect(0, 0, canvas.width, headerHeight)

    // Header text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('BRH Habitat', canvas.width / 2, 30)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, padding, headerHeight + padding, qrSize, qrSize)

      // Company name
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(companyName, canvas.width / 2, headerHeight + padding + qrSize + 22)

      // URL (truncated)
      ctx.fillStyle = '#64748b'
      ctx.font = '11px sans-serif'
      const displayUrl = url.length > 50 ? url.slice(0, 47) + '...' : url
      ctx.fillText(displayUrl, canvas.width / 2, headerHeight + padding + qrSize + 40)

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `qrcode-${companyName.toLowerCase().replace(/\s+/g, '-')}.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')
    }
    img.onerror = () => {
      // Fallback: direct link to QR API image
      const a = document.createElement('a')
      a.href = qrSrc
      a.download = `qrcode-${companyName.toLowerCase().replace(/\s+/g, '-')}.png`
      a.target = '_blank'
      a.click()
    }
    img.src = qrSrc
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col items-center gap-4 max-w-xs w-full mx-auto">
      {/* QR Code image */}
      <div className="bg-white border-4 border-primary rounded-xl p-2 shadow-inner">
        <img
          src={qrSrc}
          alt={`QR Code pour ${companyName}`}
          width={240}
          height={240}
          className="block rounded"
          loading="lazy"
        />
      </div>

      {/* Company info below QR */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <QrCode size={14} className="text-primary" />
          <p className="font-display text-sm uppercase tracking-wide text-slate-800">{companyName}</p>
        </div>
        <p className="font-body text-xs text-slate-400 break-all">{url}</p>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white font-body text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Download size={16} />
        Telecharger le QR Code
      </button>
    </div>
  )
}
