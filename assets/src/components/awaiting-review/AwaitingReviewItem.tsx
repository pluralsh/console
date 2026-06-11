import {
  AiSparkleFilledIcon,
  Button,
  Flex,
  IconFrame,
  StackIcon,
} from '@pluralsh/design-system'
import { aiGradientBorderStyles } from 'components/ai/explain/ExplainWithAIButton.tsx'
import { StackAIApprovalChip } from 'components/stacks/common/StackApprovalChip'
import { StackStatusChip } from 'components/stacks/common/StackStatusChip'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { AwaitingReviewStackFragment, StackStatus } from 'generated/graphql'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
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
  const aiApprovalResult = approvalResult?.result

  const planPath = run
    ? `${getStackRunsAbsPath(stack.id, run.id)}/${STACK_RUNS_PLAN_REL_PATH}`
    : null

  const description = pullRequest?.title ?? message

  return (
    <ItemSC>
      <ItemHeaderSC>
        <IconFrame
          icon={<StackIcon />}
          size="small"
        />
        <div>
          <Body2BoldP>Approval required</Body2BoldP>
          <CaptionP $color="text-xlight">{stack.name}</CaptionP>
        </div>
      </ItemHeaderSC>

      {description && <CaptionP $color="text-light">{description}</CaptionP>}

      {configuration?.aiApproval?.enabled && aiApprovalResult && (
        <ApprovalBoxSC css={aiGradientBorderStyles(theme)}>
          <ApprovalRowSC>
            <CaptionP $color="text-xlight">Approval decision</CaptionP>
            <AiSparkleFilledIcon
              color="icon-info"
              size={13}
            />
          </ApprovalRowSC>
          <StackAIApprovalChip approvalResult={aiApprovalResult} />
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
        </ApprovalBoxSC>
      )}

      <Flex
        align="center"
        justify="space-between"
        gap="small"
      >
        <StackStatusChip
          status={StackStatus.PendingApproval}
          size="small"
        />
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
    </ItemSC>
  )
}

const ItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
}))

const ItemHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.xsmall,
}))

const ApprovalBoxSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.medium,
}))

const ApprovalRowSC = styled(StretchedFlex)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))
