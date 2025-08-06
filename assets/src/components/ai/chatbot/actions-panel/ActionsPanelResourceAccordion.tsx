import {
  Accordion,
  AccordionItem,
  GitPullIcon,
  IconFrame,
  PrOpenIcon,
  StackIcon,
  Table,
  TableProps,
} from '@pluralsh/design-system'
import { AccessorFnColumnDef, Row } from '@tanstack/react-table'

import {
  PullRequestFragment,
  ServiceDeploymentChatFragment,
  StackChatFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { getStacksAbsPath } from 'routes/stacksRoutesConsts'
import { useTheme } from 'styled-components'
import {
  pullRequestsCol,
  servicesCol,
  stacksCol,
} from './ActionPanelResourceTablesCols'
import { ActionItemHeaderSC } from './ChatbotActionsPanel'

export function ActionsPanelResourceAccordion({
  prs,
  stacks,
  services,
  closePanel,
}: {
  prs: PullRequestFragment[]
  stacks: StackChatFragment[]
  services: ServiceDeploymentChatFragment[]
  closePanel: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  return (
    <Accordion
      type="multiple"
      css={{
        border: 'none',
        background: theme.colors['fill-accent'],
        '& > *': { borderBottom: theme.borders.default },
      }}
    >
      <ResourceAccordionItem
        name="Pull Requests"
        icon={<PrOpenIcon />}
        tableData={prs}
        columns={pullRequestsCol}
        onRowClick={(_e, { original }: Row<PullRequestFragment>) =>
          window.open(original.url, '_blank', 'noopener,noreferrer')
        }
      />
      <ResourceAccordionItem
        name="Stacks"
        icon={<StackIcon />}
        tableData={stacks}
        columns={stacksCol}
        onRowClick={(_e, { original }: Row<StackChatFragment>) => {
          closePanel()
          navigate(getStacksAbsPath(original.id))
        }}
      />
      <ResourceAccordionItem
        name="Services"
        icon={<GitPullIcon />}
        tableData={services}
        columns={servicesCol}
        onRowClick={(_e, { original }: Row<ServiceDeploymentChatFragment>) => {
          closePanel()
          navigate(
            getServiceDetailsPath({
              serviceId: original?.id,
              clusterId: original?.cluster?.id,
            })
          )
        }}
      />
    </Accordion>
  )
}

function ResourceAccordionItem<T>({
  name,
  icon,
  onRowClick,
  tableData,
  columns,
}: {
  name: string
  icon: ReactElement
  onRowClick: TableProps['onRowClick']
  tableData: T[]
  columns: AccessorFnColumnDef<T, T>[]
}) {
  const { borderRadiuses } = useTheme()
  if (isEmpty(tableData)) return null

  return (
    <AccordionItem
      key={name}
      value={name}
      trigger={
        <ActionItemHeaderSC>
          <IconFrame
            icon={icon}
            size="small"
          />
          {name}
        </ActionItemHeaderSC>
      }
    >
      <Table
        hideHeader
        virtualizeRows
        fullHeightWrap
        rowBg="base"
        borderRadius={borderRadiuses.medium}
        data={tableData}
        columns={columns}
        onRowClick={onRowClick}
      />
    </AccordionItem>
  )
}
