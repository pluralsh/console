// import original module declarations
import 'styled-components'

import { type styledTheme } from '@pluralsh/design-system'

// allow css prop on html elements
// also allow any CSS custom variable to be used in CSSProperties
declare module 'react' {
  interface Attributes {
    css?: CSSProp | undefined
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
