import type * as CSS from 'csstype'

declare module 'csstype' {
  interface Properties extends CSS.StandardLonghandProperties {
    WebkitLineClamp?: string
    WebkitBoxOrient?: 'vertical' | 'horizontal'
  }
}
