import { scrollIntoContainerView } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { capitalize } from 'lodash'
import { useEffect, useRef } from 'react'

import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'

import { getDocsData } from '../App'

import MarkdocComponent from './MarkdocContent'

export default function AppDocs() {
  const scrollRef = useRef<HTMLElement>()
  const { appName, docName } = useParams()
  const { docs } = useOutletContext() as {
    docs: ReturnType<typeof getDocsData>
  }

  const currentDoc = docs?.find(doc => doc.id === docName)

  const location = useLocation()
  const { hash } = location

  const theme = useTheme()

  useEffect(() => {
    if (hash && scrollRef.current) {
      console.log('hash', hash)
      const hashElt = scrollRef.current.querySelector(hash)

      if (!hashElt) {
        return
      }

      console.log('hashElt?.clientTop', hashElt?.getBoundingClientRect())
      scrollIntoContainerView(hashElt, scrollRef.current, {
        behavior: 'smooth',
        block: 'start',
        blockOffset: theme.spacing.xlarge,
        preventIfVisible: false,
      })
    }
  }, [hash, theme.spacing.xlarge])

  const navigate = useNavigate()

  if (!currentDoc) {
    navigate(location.pathname.split('/').slice(0, -1).join('/'))

    return null
  }

  const displayAppName = capitalize(appName)

  return (
    <ScrollablePage
      heading={`${displayAppName} docs`}
      scrollRef={scrollRef}
    >
      <MarkdocComponent content={currentDoc.content} />
    </ScrollablePage>
  )
}
