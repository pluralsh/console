import {
  AiSparkleFilledIcon,
  Button,
  Chip,
  Flex,
  IconFrame,
  StackIcon,
  WarningOutlineIcon,
} from '@pluralsh/design-system'
import { aiGradientBorderStyles } from 'components/ai/explain/ExplainWithAIButton.tsx'
import { StackAIApprovalChip } from 'components/stacks/common/StackApprovalChip'
import { CaptionP } from 'components/utils/typography/Text'
import { StackedText } from 'components/utils/table/StackedText'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { AwaitingReviewStackFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  getStackRunsAbsPath,
  STACK_RUNS_PLAN_REL_PATH,
} from '../../routes/stacksRoutesConsts'

export function AwaitingReviewItem({
  stack,
  onNavigate,
}: {
  stack: AwaitingReviewStackFragment
  onNavigate: () => void
}) {
  const theme = useTheme()
  const run = mapExistingNodes(stack.runs)[0]
  const { approvalResult, configuration, message, pullRequest } = run ?? {}
  const planPath = run
    ? `${getStackRunsAbsPath(stack.id, run.id)}/${STACK_RUNS_PLAN_REL_PATH}`
    : null

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        padding: theme.spacing.large,
      }}
    >
      <Flex
        align="center"
        gap="small"
      >
        <IconFrame
          icon={<StackIcon />}
          size="large"
          type="secondary"
          css={{ borderRadius: '50%', border: theme.borders.default }}
        />
        <StackedText
          first="Approval required"
          firstPartialType="body2Bold"
          firstColor="text"
          second={pullRequest?.title ?? message}
          truncate
          css={{ flex: 1 }}
        />
      </Flex>

      {configuration?.aiApproval?.enabled && approvalResult?.result && (
        <Flex
          direction="column"
          gap="xsmall"
          padding="small"
          css={{
            ...aiGradientBorderStyles(theme),
            borderRadius: theme.borderRadiuses.medium,
          }}
        >
          <StretchedFlex
            css={{
              alignItems: 'center',
              gap: theme.spacing.xsmall,
            }}
          >
            <CaptionP $color="text-xlight">Approval decision</CaptionP>
            <AiSparkleFilledIcon
              color="icon-info"
              size={13}
            />
          </StretchedFlex>
          <StackAIApprovalChip approvalResult={approvalResult?.result} />
          {approvalResult?.reason && (
            <>
              <CaptionP
                $color="text-xlight"
                css={{ marginTop: theme.spacing.small }}
              >
                Approval reason
              </CaptionP>
              <CaptionP $color="text-light">{approvalResult?.reason}</CaptionP>
            </>
          )}
        </Flex>
      )}

      <Flex
        align="center"
        justify="space-between"
        gap="small"
      >
        <Chip
          size="small"
          iconColor="icon-warning"
          icon={<WarningOutlineIcon />}
        >
          Pending approval
        </Chip>
        {planPath && (
          <Button
            small
            as={Link}
            to={planPath}
            onClick={onNavigate}
          >
            View plan
          </Button>
        )}
      </Flex>
    </div>
  )
}
