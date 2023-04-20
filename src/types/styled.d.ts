// import original module declarations
import 'styled-components'

import { type styledTheme } from '../theme'

type StyledTheme = typeof styledTheme

// and extend them!
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StyledTheme {}
}
