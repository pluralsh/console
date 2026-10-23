import { promises as fs } from 'fs'
import path from 'path'

import Markdoc from '@markdoc/markdoc'
import { Parser } from 'htmlparser2'
import yaml from 'js-yaml'

import { type MarkdocPage, config as schemaConfig } from './mdSchema'

const fileCache = new Map<string, MarkdocPage | null>()

export const readMdFileCached = async (
  filePath: string
): Promise<MarkdocPage | null> => {
  if (!filePath.startsWith('pages')) {
    return null
  }
  function cacheAndReturn(val: MarkdocPage | null) {
    fileCache.set(filePath, val)

    return val
  }
  const cachedVal = fileCache.get(filePath)

  if (cachedVal !== undefined) {
    return cachedVal
  }

  // Scoped to pages/ so output tracing doesn't pull the whole project into the server bundle
  const fullPath = path.join(
    process.cwd(),
    'pages',
    path.relative('pages', filePath)
  )

  try {
    const file = await fs.readFile(fullPath, 'utf8')

    if (!file) {
      return cacheAndReturn(null)
    }

    const tokenizer = new Markdoc.Tokenizer({ html: true })
    const tokens = tokenizer.tokenize(file)
    const processed = processHtmlTokens(tokens)
    const ast = Markdoc.parse(processed)

    const frontmatter = ast.attributes.frontmatter
      ? yaml.load(ast.attributes.frontmatter)
      : {}

    // transform silently drops unknown tags, so fail loudly instead
    const undefinedTags = Markdoc.validate(ast, schemaConfig).filter(
      ({ error }) => error.id === 'tag-undefined'
    )

    if (undefinedTags.length > 0) {
      throw new MarkdocValidationError(
        undefinedTags
          .map(({ lines, error }) => {
            const line = lines[0] !== undefined ? `:${lines[0] + 1}` : ''

            return `${filePath}${line}: ${error.message}`
          })
          .join('\n')
      )
    }

    const content = Markdoc.transform(ast, schemaConfig)

    const ret: MarkdocPage = JSON.parse(
      JSON.stringify({
        content,
        frontmatter,
        file: {
          path: filePath.replace(/^pages/g, ''),
        },
      })
    )

    return cacheAndReturn(ret)
  } catch (e) {
    if (e instanceof MarkdocValidationError) throw e

    return cacheAndReturn(null)
  }
}

class MarkdocValidationError extends Error {
  name = 'MarkdocValidationError'
}

// Placeholders like `<cluster-handle>` in prose parse as unclosed elements that
// swallow the rest of the page and break hydration, so anything that isn't a
// standard HTML element is kept as literal text.
const HTML_ELEMENTS = new Set(
  (
    'a abbr address article aside b bdi bdo blockquote br caption cite code col ' +
    'colgroup dd del details dfn div dl dt em figcaption figure footer h1 h2 h3 ' +
    'h4 h5 h6 header hr i iframe img ins kbd li mark ol p picture pre q s samp ' +
    'section small source span strong sub summary sup table tbody td tfoot th ' +
    'thead time tr u ul var video wbr'
  ).split(' ')
)

// see https://github.com/markdoc/markdoc/issues/10
// https://gist.github.com/rpaul-stripe/941eb22c4779ea87b1adf7715d76ca08
function processHtmlTokens(tokens) {
  const output: any[] = []
  let source = ''
  const rawTag = () => source.slice(parser.startIndex, parser.endIndex + 1)

  const parser = new Parser({
    onopentag(name, attrs) {
      if (!HTML_ELEMENTS.has(name)) {
        output.push({ type: 'text', content: rawTag() })
        return
      }
      output.push({
        type: 'tag_open',
        nesting: 1,
        meta: {
          tag: 'html-tag',
          attributes: [
            { type: 'attribute', name: 'name', value: name },
            { type: 'attribute', name: 'attrs', value: attrs },
          ],
        },
      })
    },

    ontext(content) {
      if (typeof content === 'string' && content.trim().length > 0)
        output.push({ type: 'text', content })
    },

    onclosetag(name, isImplied) {
      if (!HTML_ELEMENTS.has(name)) {
        if (!isImplied) output.push({ type: 'text', content: rawTag() })
        return
      }
      output.push({
        type: 'tag_close',
        nesting: -1,
        meta: { tag: 'html-tag' },
      })
    },
  })

  for (const token of tokens) {
    if (token.type.startsWith('html')) {
      source += token.content
      parser.write(token.content)
      continue
    }

    if (token.type === 'inline')
      token.children = processHtmlTokens(token.children)

    output.push(token)
  }

  return output
}
