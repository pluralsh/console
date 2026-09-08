import fs from 'fs'
import path from 'path'
import { type ParsedUrlQuery } from 'querystring'

import { type GetStaticPaths, type GetStaticProps } from 'next'

import MarkdocComponent from '@src/components/MarkdocContent'
import { readMdFileCached } from '@src/markdoc/mdParser'
import { type MarkdocPage } from '@src/markdoc/mdSchema'

import routes from '../generated/routes.json'

interface Params extends ParsedUrlQuery {
  slug: string[]
}

export default function MarkdocContent({
  slug,
  markdoc,
}: {
  slug: string
  markdoc: MarkdocPage | null
}) {
  return (
    markdoc && (
      <MarkdocComponent
        key={slug} // need to force re-render when slug changes
        markdoc={markdoc}
      />
    )
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  // get all valid paths from routes.json (which generates on dev and build so should be up to date)
  const paths = Object.entries(routes)
    .filter(([_, routeInfo]) => routeInfo.relPath !== null)
    .map(([routePath]) => ({
      params: { slug: normalizePath(routePath).split('/') },
    }))

  return {
    paths,
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps<
  { markdoc: MarkdocPage | null },
  Params
> = async ({ params }) => {
  if (!params?.slug) return { notFound: true }

  const slugStr = `/${params.slug.join('/')}`
  const routeInfo = routes[slugStr]

  if (!routeInfo || !routeInfo.relPath) return { notFound: true }

  const filePath = path.join('pages', routeInfo.relPath)

  if (!fs.existsSync(filePath)) return { notFound: true }

  const markdoc = await readMdFileCached(filePath)

  return {
    props: {
      displayTitle: markdoc?.frontmatter?.title ?? '',
      displayDescription: markdoc?.frontmatter?.description ?? '',
      markdoc,
      slug: slugStr,
    },
  }
}

const normalizePath = (path: string) =>
  path.startsWith('/') ? path.substring(1) : path
