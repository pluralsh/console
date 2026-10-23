import { useNavigate, useParams } from 'react-router-dom'
import {
  CD_ABS_PATH,
  SERVICES_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useMemo, useState } from 'react'
import {
  DiffColumnIcon,
  DiffUnifiedIcon,
  DiffViewer,
  IconFrame,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { PageToolbarPortal } from 'components/layout/PageToolbar'

import { isEmpty } from 'lodash'

import { useServiceContext } from './ServiceDetailsContext'

const SEPARATOR = '\n---\n'
const NEW_LINE_REGEXP = /^\s+|\s+$/g

export default function ServiceDryRun() {
  const navigate = useNavigate()
  const theme = useTheme()
  const [splitView, setSplitView] = useState(true)
  const { service } = useServiceContext()
  const { flowIdOrName } = useParams()

  const [live, desired] = useMemo(
    () => [
      service?.components
        ?.map((c) => c?.content?.live?.replace(NEW_LINE_REGEXP, '') ?? '')
        ?.join(SEPARATOR) ?? '',
      service?.components
        ?.map((c) => c?.content?.desired?.replace(NEW_LINE_REGEXP, '') ?? '')
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
        flowIdOrName,
      })
    )

    return null
  }

  return (
    <ScrollablePage
      scrollable={false}
      noPadding
    >
      {!(isEmpty(live) && isEmpty(desired)) && (
        <PageToolbarPortal>
          <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
            <IconFrame
              clickable
              onClick={() => setSplitView(true)}
              selected={splitView}
              type="secondary"
              icon={<DiffColumnIcon />}
              tooltip="Use split view"
            />
            <IconFrame
              clickable
              onClick={() => setSplitView(false)}
              selected={!splitView}
              type="secondary"
              icon={<DiffUnifiedIcon />}
              tooltip="Use unified view"
            />
          </div>
        </PageToolbarPortal>
      )}
      {isEmpty(live) && isEmpty(desired) ? (
        <div>There is no data available yet.</div>
      ) : (
        <DiffViewer
          oldValue={live}
          newValue={desired}
          splitView={splitView}
        />
      )}
    </ScrollablePage>
  )
}
