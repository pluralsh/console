import {
  Button,
  Flex,
  ReloadIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'

import { CD_REL_PATH } from 'routes/cdRoutesConsts'

import { useParams } from 'react-router-dom'

import { InsightDisplay } from 'components/stacks/insights/StackInsights'
import ConsolePageTitle from 'components/utils/layout/ConsolePageTitle'
import { CaptionP } from 'components/utils/typography/Text'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'
import { useTheme } from 'styled-components'
import moment from 'moment/moment'

export function ServiceInsights() {
  const theme = useTheme()
  const { service, refetch, loading } = useServiceContext()
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
        <Flex
          align="center"
          gap="small"
        >
          <CaptionP
            css={{ width: 'max-content' }}
            $color="text-xlight"
          >
            {service.insight?.updatedAt &&
              `Last updated ${moment(service.insight?.updatedAt).fromNow()}`}
          </CaptionP>
          <Button
            floating
            startIcon={<ReloadIcon />}
            onClick={() => refetch()}
            loading={loading}
          >
            Refresh insights
          </Button>
        </Flex>
      </Flex>
      <InsightDisplay text={service.insight?.text} />
    </Flex>
  )
}
