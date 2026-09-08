import {
  CloseIcon,
  DiscoverIcon,
  Flex,
  IconFrame,
  Modal,
} from '@pluralsh/design-system'
import { SendToWorkbenchForm } from 'components/ai/insights/SendInsightToWorkbench'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import pluralize from 'pluralize'
import { useTheme } from 'styled-components'

export function VulnFixModal({
  open,
  onClose,
  vulnCount,
  initialPrompt,
  flowId,
}: {
  open: boolean
  onClose: () => void
  vulnCount: number
  initialPrompt: string
  flowId?: Nullable<string>
}) {
  const { colors } = useTheme()
  const headerTitle = `Fix ${pluralize('vulnerability', vulnCount, vulnCount !== 1)}`

  return (
    <Modal
      size="large"
      open={open}
      onClose={onClose}
      scrollable
    >
      <Flex
        direction="column"
        gap="large"
      >
        <StretchedFlex>
          <StackedText
            first={headerTitle}
            firstPartialType="body1"
            firstColor="text-light"
            icon={<DiscoverIcon />}
            iconGap="xsmall"
          />
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon color={colors['icon-light']} />}
            onClick={onClose}
          />
        </StretchedFlex>
        <SendToWorkbenchForm
          flowId={flowId}
          prompt={initialPrompt}
          backLabel="Vulnerabilities"
          submitLabel="Approve fix"
        />
      </Flex>
    </Modal>
  )
}
