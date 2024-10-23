import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { CD_REL_PATH } from 'routes/cdRoutesConsts'

import { useParams } from 'react-router-dom'

import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'
import { CaptionP } from 'components/utils/typography/Text'
import { dateTimeFormat } from 'utils/date'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'
import { useTheme } from 'styled-components'

export function ServiceInsights() {
  const theme = useTheme()
  const { service } = useServiceContext()
  const { serviceId, clusterId } = useParams()

  const breadcrumbs = useMemo(
    () => [
      ...getServiceDetailsBreadcrumbs({
        cluster: service?.cluster || { id: clusterId || '' },
        service: service || { id: serviceId || '' },
      }),
      {
        label: 'insights',
        url: `${CD_REL_PATH}/services/${serviceId}/insights`,
      },
    ],
    [clusterId, service, serviceId]
  )

  useSetBreadcrumbs(breadcrumbs)

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      marginBottom={theme.spacing.large}
    >
      <Flex
        justify="space-between"
        alignItems="center"
      >
        <ConsolePageTitle heading="Insights" />
        <Flex gap="small">
          <CaptionP
            css={{ width: 'max-content' }}
            $color="text-xlight"
          >
            {service.insight?.updatedAt &&
              `Last updated ${dateTimeFormat(service.insight?.updatedAt)}`}
          </CaptionP>
          {/* TODO: Add refresh button here */}
        </Flex>
      </Flex>
      <InsightDisplay text={service.insight?.text} />
    </Flex>
  )
}
