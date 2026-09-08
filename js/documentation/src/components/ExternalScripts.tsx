import { useEffect } from 'react'

import { useRouter } from 'next/router'
import Script from 'next/script'

function HubSpot() {
  const router = useRouter()

  useEffect(() => {
    if (!router?.events?.on) {
      return
    }
    const handleRouteChangeComplete = (url) => {
      if (!(window as any)?.Cookiebot?.consent?.statistics) {
        return
      }
      const _hsq = ((window as any)._hsq = (window as any)._hsq || [])

      _hsq.push(['setPath', url])
      _hsq.push(['trackPageView'])
    }

    router.events.on('routeChangeComplete', handleRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
    }
  }, [router.events])

  // Turn tracking on and off when cookie prefs change
  useEffect(() => {
    const onCookiePrefChange = () => {
      const _hsq = (window._hsq = window._hsq || [])

      _hsq.push([
        'doNotTrack',
        { track: window.Cookiebot?.consent?.statistics },
      ])
    }

    window.addEventListener('CookiebotOnAccept', onCookiePrefChange)
    window.addEventListener('CookiebotOnDecline', onCookiePrefChange)

    return () => {
      window.removeEventListener('CookiebotOnAccept', onCookiePrefChange)
      window.removeEventListener('CookiebotOnDecline', onCookiePrefChange)
    }
  }, [])

  return (
    <Script
      type="text/plain"
      data-cookieconsent="statistics"
      strategy="afterInteractive"
      id="hs-script-loader"
      async
      defer
      src="//js.hs-scripts.com/22363579.js"
    />
  )
}

// function safeKapaUnmount() {
//   const kapa = window.Kapa

//   if (typeof kapa !== 'function') {
//     return
//   }

//   try {
//     kapa('unmount')
//   } catch {
//     // Widget may not have mounted yet
//   }
// }

function KapaWidget() {
  // useEffect(() => {
  //   const onCookiePrefChange = () => {
  //     if (!window.Cookiebot?.consent?.statistics) {
  //       safeKapaUnmount()
  //     }
  //   }

  //   window.addEventListener('CookiebotOnAccept', onCookiePrefChange)
  //   window.addEventListener('CookiebotOnDecline', onCookiePrefChange)

  //   return () => {
  //     window.removeEventListener('CookiebotOnAccept', onCookiePrefChange)
  //     window.removeEventListener('CookiebotOnDecline', onCookiePrefChange)
  //   }
  // }, [])

  return (
    <Script
      // id="kapa-widget-script"
      // type="text/plain"
      // data-cookieconsent="statistics"
      strategy="afterInteractive"
      async
      defer
      src="https://widget.kapa.ai/kapa-widget.bundle.js"
      data-website-id="8288b978-8aca-4409-9cbd-de12c446cf07"
      data-project-name="Plural"
      data-view-mode="sidebar"
      data-modal-open-on-command-k="true"
      data-search-mode-enabled="true"
      data-mcp-enabled="true"
      data-mcp-server-url="https://plural.mcp.kapa.ai"
      data-project-color="#5D63F4"
      data-project-logo="https://docs.plural.sh/favicon-192.png"
    />
  )
}

export default function ExternalScripts() {
  return (
    <>
      <HubSpot />
      <KapaWidget />
    </>
  )
}
