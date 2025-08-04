import {
  ServiceDeploymentTinyFragment,
  useChatAgentSessionServicesQuery,
} from '../../../../generated/graphql.ts'
import {
  AccordionItem,
  ChecklistIcon,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../../utils/table/useFetchPaginatedData.tsx'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../../../utils/graphql.ts'
import { isEmpty } from 'lodash'
import { ActionItemHeaderSC } from './ChatbotActionsPanel.tsx'

export function Services({ currentThreadId }: { currentThreadId: string }) {
  const { data, loading, pageInfo, fetchNextPage, setVirtualSlice } =
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
        rowBg="raised"
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

const columnHelper = createColumnHelper<ServiceDeploymentTinyFragment>()

const columns = [
  columnHelper.accessor((service) => service, {
    id: 'row',
    cell: function Cell({ getValue }) {
      const service = getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          {service.name}
        </Flex>
      )
    },
  }),
]
