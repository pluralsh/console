import {
  AccordionItem,
  ChecklistIcon,
  Flex,
  IconFrame,
  ShieldOutlineIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { ServiceDeploymentChatFragment } from '../../../../generated/graphql.ts'

import { isEmpty } from 'lodash'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts.tsx'
import { ServiceStatusChip } from '../../../cd/services/ServiceStatusChip.tsx'
import { AiInsightSummaryIcon } from '../../../utils/AiInsights.tsx'
import { DistroProviderIconFrame } from '../../../utils/ClusterDistro.tsx'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'

export function Services({
  services,
}: {
  services: ServiceDeploymentChatFragment[]
}) {
  const navigate = useNavigate()

  if (isEmpty(services)) return null

  return (
    <AccordionItem
      key="services"
      value="services"
      trigger={
        <ActionItemHeaderSC>
          <IconFrame
            icon={<ChecklistIcon />}
            size="small"
          />
          Services
        </ActionItemHeaderSC>
      }
    >
      <Table
        hideHeader
        rowBg="base"
        fullHeightWrap
        virtualizeRows
        data={services}
        columns={columns}
        onRowClick={(_e, { original }: Row<ServiceDeploymentChatFragment>) =>
          navigate(
            getServiceDetailsPath({
              serviceId: original?.id,
              clusterId: original?.cluster?.id,
            })
          )
        }
      />
    </AccordionItem>
  )
}

const columnHelper = createColumnHelper<ServiceDeploymentChatFragment>()

const columns = [
  columnHelper.accessor((service) => service, {
    id: 'row',
    meta: { gridTemplate: '300' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const service = getValue()

      return (
        <Flex
          direction="column"
          gap="xsmall"
          padding="xxsmall"
          width="100%"
        >
          <Flex
            align="center"
            gap="xsmall"
            flex={1}
          >
            <Body2P css={{ maxWidth: 140, ...TRUNCATE }}>{service.name}</Body2P>
            {service?.protect && (
              <IconFrame
                icon={<ShieldOutlineIcon />}
                size="small"
              />
            )}
            <Flex flex={1} />
            <AiInsightSummaryIcon insight={service.insight} />
            <ServiceStatusChip
              size="small"
              status={service.status}
              componentStatus={service.componentStatus}
            />
          </Flex>
          <Flex
            alignItems="center"
            gap="xxsmall"
          >
            <DistroProviderIconFrame
              distro={service.cluster?.distro}
              provider={service.cluster?.provider?.cloud}
              fillLevel={0}
              type="tertriary"
              size="small"
            />
            <CaptionP css={{ color: theme.colors['text-xlight'] }}>
              {service.cluster?.name}
            </CaptionP>
          </Flex>
        </Flex>
      )
    },
  }),
]
