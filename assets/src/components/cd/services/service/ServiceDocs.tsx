import {
  Breadcrumb,
  scrollIntoContainerView,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { capitalize } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'

import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { useDocPageContext } from 'components/contexts/DocPageContext'

import MarkdocComponent from 'components/utils/MarkdocContent'

import {
  CD_BASE_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export default function ServiceDocs() {
  const scrollRef = useRef<HTMLElement>()
  const { appName, docName } = useParams()
  const { docs } = useServiceContext()
  const { scrollHash, scrollToHash } = useDocPageContext()
  const { serviceId, clusterId } = useParams<{
    [SERVICE_PARAM_ID]: string
    [SERVICE_PARAM_CLUSTER_ID]: string
  }>()
  const { service } = useServiceContext()

  const hashFromUrl = useLocation().hash.slice(1)
  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster || { id: clusterId || '' },
        service: service || { id: serviceId || '' },
      }),
      {
        label: 'docs',
        url: `${CD_BASE_PATH}/services/${serviceId}/docs`,
      },
    ],
    [clusterId, service, serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)

  useEffect(() => {
    scrollToHash(hashFromUrl)
    // Only want to run this on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const currentDoc = docs?.find((doc) => doc.id === docName)
  const location = useLocation()

  useEffect(() => {
    if (scrollHash.value && scrollRef.current) {
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
    }
  }, [scrollHash])

  const navigate = useNavigate()

  if (!currentDoc) {
    navigate(
      `${location.pathname.split('/').slice(0, -1).join('/')}/components`
    )

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
