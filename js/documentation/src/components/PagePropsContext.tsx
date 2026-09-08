import { createContext } from 'react'

import type { MarkdocNextJsPageProps } from '@markdoc/next.js'

export const PagePropsContext = createContext<MarkdocNextJsPageProps>({})
