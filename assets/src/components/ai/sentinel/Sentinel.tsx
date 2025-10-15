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
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useSentinelQuery, useSentinelRunsQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AI_SENTINELS_ABS_PATH } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { getAIBreadcrumbs } from '../AI'
import { SentinelSidecar } from './SentinelSidecar'
import { SentinelRunDialog } from './SentinelsTableCols'

export function Sentinel() {
  const { breakpoints } = useTheme()
  const { id } = useParams()
  const [runModalOpen, setRunModalOpen] = useState(false)
  const {
    data: sentinelData,
    error: sentinelError,
    loading: _sentinelLoading,
  } = useSentinelQuery({ variables: { id }, fetchPolicy: 'network-only' })
  const sentinelLoading = !sentinelData && _sentinelLoading
  const sentinel = sentinelData?.sentinel

  const {
    data: sentinelRunsData,
    error: sentinelRunsError,
    loading: sentinelRunsLoading,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useSentinelRunsQuery, keyPath: ['sentinel', 'runs'] },
    { id }
  )

  useSetBreadcrumbs(
    useMemo(
      () => [...getAIBreadcrumbs('sentinels'), { label: sentinel?.name ?? '' }],
      [sentinel?.name]
    )
  )

  if (sentinelError) return <GqlError error={sentinelError} />

  return (
    <Flex
      height="100%"
      width="100%"
      padding="large"
      maxWidth={breakpoints.desktopLarge}
      alignSelf="center"
    >
      <MainContentSC>
        <HeaderSC>
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
        </HeaderSC>
        <Divider backgroundColor="border" />
      </MainContentSC>
      <SentinelSidecar sentinel={sentinel} />
      <SentinelRunDialog
        sentinel={sentinel}
        open={runModalOpen}
        onClose={() => setRunModalOpen(false)}
      />
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
