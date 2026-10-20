// pages/_document.js
import Document, { Head, Html, Main, NextScript } from 'next/document'

import { ServerStyleSheet } from 'styled-components'

import {
  COLOR_MODE_KEY,
  colorModeScript,
  DEFAULT_COLOR_MODE,
} from '@src/theme/colorMode'

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const sheet = new ServerStyleSheet()
    const originalRenderPage = ctx.renderPage

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        })

      const initialProps = await Document.getInitialProps(ctx)

      return {
        ...initialProps,
        styles: [initialProps.styles, sheet.getStyleElement()],
      }
    } finally {
      sheet.seal()
    }
  }

  // Using gtag with Cookiebot: https://support.cookiebot.com/hc/en-us/articles/360003979074-Using-Google-Gtag-with-Cookiebot
  render() {
    return (
      <Html {...{ [`data-${COLOR_MODE_KEY}`]: DEFAULT_COLOR_MODE }}>
        <Head>
          <script dangerouslySetInnerHTML={{ __html: colorModeScript }} />
          <link
            rel="preconnect"
            href="https://fonts.googleapis.com"
          />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=swap"
            rel="stylesheet"
          />
          <link
            rel="preload"
            href="/fonts/Articulat-Normal.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <script
            id="Cookiebot"
            src="https://consent.cookiebot.com/uc.js"
            data-cbid="c6718f17-016b-4d02-9bc2-9f1467f610fb"
            data-blockingmode="manual"
            type="text/javascript"
            data-widget-position="bottom-right"
          />
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage:'denied', analytics_storage:'denied'});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
gtag('js', new Date());
gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');`,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
