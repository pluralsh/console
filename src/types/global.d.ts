type Nullable<T> = T | null | undefined

type MermaidApi = {
  initialize: (config: {
    startOnLoad: boolean
    theme?: 'default' | 'neutral' | 'dark' | 'forest' | 'base'
  }) => void
  render: (id: string, code: string) => Promise<{ svg: string }>
}

interface Window {
  mermaid?: MermaidApi
}
