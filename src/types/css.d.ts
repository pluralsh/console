import type * as CSS from 'csstype'

declare module 'csstype' {
  interface Properties extends CSS.StandardLonghandProperties {
    '-webkit-line-clamp'?: string;
    '-webkit-box-orient'?: 'vertical' | 'horizontal';
  }
}
