import {
  AiSparkleFilledIcon,
  Button,
  Chip,
  Flex,
  IconFrame,
  StackIcon,
  WarningOutlineIcon,
} from '@pluralsh/design-system'
import { StackAIApprovalChip } from 'components/stacks/common/StackApprovalChip'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { StackedText } from 'components/utils/table/StackedText'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { AwaitingReviewStackFragment, StackStatus } from 'generated/graphql'
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
  const run = mapExistingNodes(stack.runs).findLast(
    (stackRun) => stackRun.status === StackStatus.PendingApproval
  )
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
            backgroundImage: `linear-gradient(${theme.colors['fill-one']}, ${theme.colors['fill-one']}), linear-gradient(316deg, #E3A966 0%, #8961F4 32%, #747AF6 71%, #6D94F9 100%)`,
            backgroundClip: 'padding-box, border-box',
            backgroundOrigin: 'border-box',
            border: '1px solid transparent',
            borderRadius: theme.borderRadiuses.large,
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
          <StackAIApprovalChip
            approvalResult={approvalResult?.result}
            size="small"
            width="fit-content"
          />
          {approvalResult?.reason && (
            <>
              <CaptionP
                $color="text-xlight"
                css={{ marginTop: theme.spacing.small }}
              >
                Approval reason
              </CaptionP>
              <Body2P $color="text-light">{approvalResult?.reason}</Body2P>
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
