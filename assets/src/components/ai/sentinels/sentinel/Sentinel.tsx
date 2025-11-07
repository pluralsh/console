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
import { SentinelRunsTables } from './SentinelRunsTable'
import { SentinelDetailsSidecar } from './SentinelSidecars'
import { SentinelRunDialog } from '../SentinelsTableCols'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

export function Sentinel() {
  const { id } = useParams()
  const [runModalOpen, setRunModalOpen] = useState(false)
  const { data, error, loading } = useSentinelQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !id,
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
    <DetailsPageWithSidecarWrapper
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
      content={id && <SentinelRunsTables id={id} />}
      sidecar={<SentinelDetailsSidecar sentinel={sentinel} />}
    />
  )
}

export function DetailsPageWithSidecarWrapper({
  header,
  content,
  sidecar,
}: {
  header: ReactNode
  content: ReactNode
  sidecar?: ReactNode
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
  width: '100%',
  gap: theme.spacing.large,
  flex: 1,
}))
