import {
  ServiceDeploymentChatFragment,
  useChatAgentSessionServicesQuery,
} from '../../../../generated/graphql.ts'
import {
  AccordionItem,
  ChecklistIcon,
  Flex,
  IconFrame,
  ShieldOutlineIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../../utils/table/useFetchPaginatedData.tsx'

import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'
import { Body2P, CaptionP } from '../../../utils/typography/Text.tsx'
import { ServiceStatusChip } from '../../../cd/services/ServiceStatusChip.tsx'
import { AiInsightSummaryIcon } from '../../../utils/AiInsights.tsx'
import { isEmpty } from 'lodash'
import { TRUNCATE } from '../../../utils/truncate.ts'
import { useTheme } from 'styled-components'
import { DistroProviderIconFrame } from '../../../utils/ClusterDistro.tsx'
import { GqlError } from '../../../utils/Alert.tsx'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../../../utils/graphql.ts'

export function Services({ currentThreadId }: { currentThreadId: string }) {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useChatAgentSessionServicesQuery,
        keyPath: ['chatThread', 'session', 'serviceDeployments'],
      },
      { id: currentThreadId }
    )

  const services = useMemo(
    () => mapExistingNodes(data?.chatThread?.session?.serviceDeployments),
    [data?.chatThread?.session?.serviceDeployments]
  )

  if (error) return <GqlError error={error} />

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
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
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
