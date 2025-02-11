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
