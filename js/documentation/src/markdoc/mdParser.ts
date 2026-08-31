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

  const fullPath = path.join(process.cwd(), filePath)

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
    // console.error(e)

    return cacheAndReturn(null)
  }
}

// see https://github.com/markdoc/markdoc/issues/10
// https://gist.github.com/rpaul-stripe/941eb22c4779ea87b1adf7715d76ca08
function processHtmlTokens(tokens) {
  const output: any[] = []

  const parser = new Parser({
    onopentag(name, attrs) {
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

    onclosetag() {
      output.push({
        type: 'tag_close',
        nesting: -1,
        meta: { tag: 'html-tag' },
      })
    },
  })

  for (const token of tokens) {
    if (token.type.startsWith('html')) {
      parser.write(token.content)
      continue
    }

    if (token.type === 'inline')
      token.children = processHtmlTokens(token.children)

    output.push(token)
  }

  return output
}
