import {
  Button,
  Divider,
  Flex,
  IconFrame,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useSentinelQuery } from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AI_SENTINELS_ABS_PATH } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { getAIBreadcrumbs } from '../../AI'
import { SentinelChecksAccordion } from './SentinelChecksAccordion'
import { SentinelRunsTable } from './SentinelRunsTable'
import { SentinelDetailsSidecar } from './SentinelSidecars'
import { SentinelRunDialog } from '../SentinelsTableCols'

export function Sentinel() {
  const { id } = useParams()
  const [runModalOpen, setRunModalOpen] = useState(false)
  const { data, error, loading } = useSentinelQuery({
    variables: { id },
  })
  const sentinelLoading = !data && loading
  const sentinel = data?.sentinel

  useSetBreadcrumbs(
    useMemo(
      () => [...getAIBreadcrumbs('sentinels'), { label: sentinel?.name ?? '' }],
      [sentinel?.name]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <SentinelDetailsPageWrapper
      header={
        <>
          <StackedText
            loading={sentinelLoading}
            first={sentinel?.name}
            firstPartialType="subtitle1"
            firstColor="text"
            second={sentinel?.description}
            secondPartialType="body2"
            secondColor="text-xlight"
            icon={
              <IconFrame
                clickable
                as={Link}
                to={AI_SENTINELS_ABS_PATH}
                type="secondary"
                icon={<ReturnIcon />}
                size="large"
                tooltip="View all sentinels"
              />
            }
          />
          <Button
            small
            onClick={() => setRunModalOpen(true)}
          >
            Run
          </Button>
          <SentinelRunDialog
            sentinel={sentinel}
            open={runModalOpen}
            onClose={() => setRunModalOpen(false)}
          />
        </>
      }
      content={
        <>
          <SentinelChecksAccordion
            sentinel={sentinel}
            loading={sentinelLoading}
          />
          {id && <SentinelRunsTable id={id} />}
        </>
      }
      sidecar={<SentinelDetailsSidecar sentinel={sentinel} />}
    />
  )
}

export function SentinelDetailsPageWrapper({
  header,
  content,
  sidecar,
}: {
  header: ReactNode
  content: ReactNode
  sidecar: ReactNode
}) {
  const { breakpoints } = useTheme()
  return (
    <Flex
      height="100%"
      width="100%"
      minHeight={0}
      padding="large"
      maxWidth={breakpoints.desktopLarge}
      alignSelf="center"
    >
      <MainContentSC>
        <HeaderSC>{header}</HeaderSC>
        <Divider backgroundColor="border" />
        {content}
      </MainContentSC>
      {sidecar}
    </Flex>
  )
}

const HeaderSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
})
const MainContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  flex: 1,
}))
