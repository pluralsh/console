import { scrollIntoContainerView } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { capitalize } from 'lodash'
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'

import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'

import { useTheme } from 'styled-components'

import { getDocsData } from '../App'

import { useDocPageContext } from './AppDocsContext'

import MarkdocComponent from './MarkdocContent'

export default function AppDocs() {
  const scrollRef = useRef<HTMLElement>()
  const { appName, docName } = useParams()
  const { docs, scrollToId = { current: null } } = useOutletContext() as {
    docs: ReturnType<typeof getDocsData>
    scrollToId: MutableRefObject<(id: string) => void>
  }
  const { scrollHash, scrollToHash } = useDocPageContext()

  const hashFromUrl = useLocation().hash.slice(1)

  useEffect(() => {
    scrollToHash(hashFromUrl)
    // Only want to run this on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  scrollToId.current = (id: string) => {
    if (scrollRef.current) {
      console.log('hash', hash)
      const scrollToElt = id
        ? scrollRef.current.querySelector(`#${id}`)
        : Array.from(scrollRef.current.children)[0]

      if (!scrollToElt) {
        return
      }

      console.log('hashElt?.clientTop', scrollToElt?.getBoundingClientRect())
      scrollIntoContainerView(scrollToElt, scrollRef.current, {
        behavior: 'smooth',
        block: 'start',
        blockOffset: theme.spacing.xlarge,
        preventIfVisible: false,
      })
    }
  }

  const currentDoc = docs?.find(doc => doc.id === docName)

  const location = useLocation()

  const theme = useTheme()

  useEffect(() => {
    if (scrollHash.value && scrollRef.current) {
      console.log('scrollHash', scrollHash)
      const hashElt = scrollRef.current.querySelector(`#${scrollHash.value}`)

      if (!hashElt) {
        return
      }
      scrollIntoContainerView(hashElt, scrollRef.current, {
        behavior: 'smooth',
        block: 'start',
        blockOffset: 32,
        preventIfVisible: false,
      })
      console.log('hashElt?.clientTop', hashElt?.getBoundingClientRect())
    }
  }, [scrollHash])

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
