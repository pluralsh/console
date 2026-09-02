import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import {
  type DocSection,
  docsStructure,
  redirects,
} from '../src/routing/docs-structure'

type FileInfo = {
  relPath: string | null
  lastmod: string | null
}

export type RouteIndex = Record<string, FileInfo>

function generateRouteIndex() {
  // initially build with defined docs structure
  const routeIndex: RouteIndex = docsStructure.reduce(
    (acc, section) => ({ ...acc, ...processDocSection(section) }),
    {}
  )

  // then process redirects, which will also overwrite conflicting routes (the redirect should be removed if this is undesired)
  redirects.forEach(
    ({ source, destination }) => (routeIndex[source] = getFileInfo(destination))
  )

  // generate routes.json file
  const dir = path.join(process.cwd(), 'generated')

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  fs.writeFileSync(
    path.join(dir, 'routes.json'),
    JSON.stringify(routeIndex, null, 2),
    'utf8'
  )
  console.log(
    `Generated routes.json with ${Object.keys(routeIndex).length} routes`
  )
}

function processDocSection(
  section: DocSection,
  parentPath: string = ''
): RouteIndex {
  const curRoutePath = `${parentPath}/${section.path}`
  const index: RouteIndex = { [curRoutePath]: getFileInfo(curRoutePath) }

  section.sections?.forEach((child) =>
    Object.assign(index, processDocSection(child, curRoutePath))
  )

  return index
}

function getFileInfo(routePath: string): FileInfo {
  // first check for index.md, otherwise try pathname.md
  let fullPath = path.join(process.cwd(), 'pages', routePath, 'index.md')
  let relPath = `${routePath}/index.md`

  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(process.cwd(), 'pages', `${routePath}.md`)
    relPath = `${routePath}.md`
  }

  const lastmodDate = execSync(`git log -1 --format="%cI" -- "${fullPath}"`, {
    encoding: 'utf-8',
  }).trim()

  return fs.existsSync(fullPath)
    ? { relPath, lastmod: new Date(lastmodDate || Date.now()).toISOString() }
    : { relPath: null, lastmod: null }
}

// execute the script
generateRouteIndex()
