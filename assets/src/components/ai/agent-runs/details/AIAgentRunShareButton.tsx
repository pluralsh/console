import {
  Button,
  CloseIcon,
  GraphQLToast,
  IconFrame,
  ListBoxItem,
  Select,
  ShareIcon,
  useCopyText,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import {
  useAgentRunTinyQuery,
  useShareAgentRunMutation,
} from 'generated/graphql'
import { useRef, useState } from 'react'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'

export function AIAgentRunShareButton({ runId }: { runId: string }) {
  const { colors, spacing } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const menuBtnRef = useRef<HTMLDivElement>(null)
  useOutsideClick(menuBtnRef, () => setDropdownOpen(false))

  const [shareAgentRun, { loading, error }] = useShareAgentRunMutation()
  const { data, loading: dataLoading } = useAgentRunTinyQuery({
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
  })

  const shared = data?.agentRun?.shared

  const url = `${window.location.origin}${getAgentRunAbsPath({ agentRunId: runId })}`
  const { copied, handleCopy } = useCopyText(url)

  return (
    <div css={{ position: 'relative', whiteSpace: 'nowrap' }}>
      <IconFrame
        clickable
        ref={menuBtnRef}
        type="secondary"
        icon={<ShareIcon color="icon-light" />}
        onClick={() => setDropdownOpen((prev) => !prev)}
      />
      <ShareMenuSC
        type="header"
        linkStyles={false}
        isOpen={dropdownOpen}
        setIsOpen={setDropdownOpen}
        fillLevel={1}
      >
        <StretchedFlex>
          <Overline>Share agent run</Overline>
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon color={colors['icon-light']} />}
            onClick={() => setDropdownOpen(false)}
          />
        </StretchedFlex>
        {!data && dataLoading ? (
          <RectangleSkeleton
            $bright
            $height="large"
            $width="100%"
          />
        ) : (
          <Select
            selectedKey={boolToKey(shared)}
            onSelectionChange={(key) =>
              shareAgentRun({
                variables: { id: runId, shared: keyToBool(`${key}`) },
              })
            }
            isDisabled={loading}
            css={{ width: '100%' }}
          >
            <ListBoxItem
              key={boolToKey(false)}
              label="Private (only me)"
            />
            <ListBoxItem
              key={boolToKey(true)}
              label={
                <span>
                  Team <strong>can view</strong> agent run
                </span>
              }
            />
          </Select>
        )}

        <Button
          disabled={copied}
          onClick={handleCopy}
          css={{ marginTop: spacing.xsmall }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </ShareMenuSC>
      <GraphQLToast
        show={!!error}
        closeTimeout={6000}
        error={error}
        header="Error updating share settings"
        position="bottom"
        margin="xxlarge"
      />
    </div>
  )
}

const ShareMenuSC = styled(SimplePopupMenu)(({ theme }) => ({
  width: 280,
  padding: theme.spacing.medium,
  gap: theme.spacing.medium,
  boxShadow: theme.boxShadows.moderate,
}))

const boolToKey = (shared: Nullable<boolean>) =>
  shared ? 'My team' : 'Only me'
const keyToBool = (key: string) => key === 'My team'
