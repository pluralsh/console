import { isValidElement } from 'react'

import { Mermaid } from '@src/components/Mermaid'

export const mermaid = {
  render: MermaidTag,
  attributes: {},
  description: 'Render a Mermaid diagram',
  example: `
  {% mermaid %}
  graph TD
      A[Client] --> B[Load Balancer]
      B --> C[Server01]
      B --> D[Server02]
  {% /mermaid %}
  `,
}

function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getTextContent).join('\n')
  if (isValidElement(node)) return getTextContent(node.props.children)

  return ''
}

function MermaidTag({ children }: { children: React.ReactNode }) {
  const diagram = getTextContent(children)

  return <Mermaid diagram={diagram} />
}
