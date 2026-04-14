import { useEffect } from 'react'

interface SEOHeadProps {
  title: string
  description: string
  ogImage?: string
  ogUrl?: string
}

export function SEOHead({ title, description, ogImage, ogUrl }: SEOHeadProps) {
  useEffect(() => {
    document.title = title

    function setMeta(name: string, content: string) {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        if (name.startsWith('og:')) {
          el.setAttribute('property', name)
        } else {
          el.setAttribute('name', name)
        }
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', description)
    setMeta('og:title', title)
    setMeta('og:description', description)
    if (ogImage) setMeta('og:image', ogImage)
    if (ogUrl) setMeta('og:url', ogUrl)
    setMeta('og:type', 'website')

    return () => {
      document.title = 'BRH - Bretagne Renovation Habitat'
    }
  }, [title, description, ogImage, ogUrl])

  return null
}
