import Head from 'next/head'
import { useRouter } from 'next/router'

const FAVICON_SIZES = [16, 32, 128, 180, 192]

function Favicons() {
  return (
    <Head>
      {FAVICON_SIZES.map((size) => (
        <link
          key={size}
          rel="icon"
          href={`/favicon-${size}.png`}
          sizes={`${size}x${size}`}
        />
      ))}
      <link
        rel="shortcut icon"
        href="/favicon.ico"
      />
      <link
        rel="icon"
        href="/favicon.ico"
      />
    </Head>
  )
}

function OpenGraph({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const router = useRouter()

  return (
    <Head>
      <meta
        property="og:image"
        content={`${process.env.NEXT_PUBLIC_ROOT_URL}/og_image.png`}
      />
      <meta
        property="og:title"
        content={title}
      />
      <meta
        property="og:description"
        content={description}
      />
      <meta
        property="og:url"
        content={`${process.env.NEXT_PUBLIC_ROOT_URL}${router.pathname}`}
      />
    </Head>
  )
}

function HtmlHead({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="title"
          content={title}
        />
        <meta
          name="description"
          content={description}
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <meta
          name="referrer"
          content="strict-origin"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </Head>
      <Favicons />
      <OpenGraph
        title={title}
        description={description}
      />
    </>
  )
}

export default HtmlHead
