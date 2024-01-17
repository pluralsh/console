import { useNavigate } from 'react-router-dom'
import {
  CD_ABS_PATH,
  SERVICES_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import DiffViewer from 'react-diff-viewer'
import { useTheme } from 'styled-components'

import { useMemo } from 'react'

import { useServiceContext } from './ServiceDetails'

const SEPARATOR = '\n---\n'

export default function ServiceDesiredState() {
  const navigate = useNavigate()
  const theme = useTheme()
  const { service } = useServiceContext()

  const [live, desired] = useMemo(
    () => [
      service?.components
        ?.map((c) => c?.content?.live ?? '')
        ?.join(SEPARATOR) ?? '',
      service?.components
        ?.map((c) => c?.content?.desired ?? '')
        ?.join(SEPARATOR) ?? '',
    ],
    [service]
  )

  if (!service) {
    navigate(`${CD_ABS_PATH}/${SERVICES_REL_PATH}`)

    return null
  }
  if (!service.dryRun) {
    navigate(
      getServiceDetailsPath({
        serviceId: service.id,
        clusterId: service.cluster?.id,
      })
    )

    return null
  }

  return (
    <ScrollablePage
      heading="Desired state"
      scrollable
    >
      <DiffViewer
        oldValue={live}
        newValue={desired}
        useDarkTheme={theme.mode === 'dark'}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: theme.colors['fill-one'],
              highlightBackground: theme.colors['fill-one-selected'],
              gutterBackground: theme.colors['fill-two'],
              codeFoldGutterBackground: theme.colors['fill-one-selected'],
              codeFoldBackground: theme.colors['fill-one-selected'],
              codeFoldContentColor: theme.colors.text,
            },
          },
        }}
      />
    </ScrollablePage>
  )
}
