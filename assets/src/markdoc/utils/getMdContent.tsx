import { parse, transform } from '@markdoc/markdoc'
import { config } from 'markdoc/mdSchema'

export function getMdContent(raw: string | null | undefined) {
  if (!raw) {
    return null
  }
  const ast = parse(raw)

  if (!ast) {
    return null
  }

  return transform(ast, config)
}
