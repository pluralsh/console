// import original module declarations
import 'styled-components'

import { type styledTheme } from '../theme'

// Allow css prop on html elements
declare module 'react' {
  interface Attributes {
    css?: CSSProp | undefined
  }
}

type StyledTheme = typeof styledTheme

// extend original module declarations
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends StyledTheme {}
  export declare function useTheme(): DefaultTheme
}
