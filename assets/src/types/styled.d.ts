// import original module declarations
import 'styled-components'
// using more specific object type instead of full styled-components CSSProp to simplify things (and we never use the other types in CSSProp anyway)
import type { StyledObject } from 'styled-components'

import { type styledTheme } from '@pluralsh/design-system'

// allow css prop on html elements
// also allow any CSS custom variable to be used in CSSProperties
declare module 'react' {
  interface Attributes {
    css?: StyledObject | undefined
  }
  interface CSSProperties {
    [key: `--${string}`]: Nullable<string | number>
  }
}

type StyledTheme = typeof styledTheme

// extend original module declarations
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends StyledTheme {}
  export declare function useTheme(): DefaultTheme
}
