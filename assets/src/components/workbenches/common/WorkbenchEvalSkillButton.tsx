import { Button } from '@pluralsh/design-system'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { useWorkbenchEvalSkillMutation } from 'generated/graphql'
import { ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'

type WorkbenchEvalSkillButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'loading' | 'onClick'
> & {
  evalResultId?: Nullable<string>
  workbenchId: string
}

export function WorkbenchEvalSkillButton({
  evalResultId,
  workbenchId,
  disabled,
  ...props
}: WorkbenchEvalSkillButtonProps) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()

  const [workbenchEvalSkill, { loading }] = useWorkbenchEvalSkillMutation({
    onCompleted: ({ workbenchEvalSkill }) => {
      popToast({
        content: 'Skills updated successfully',
        severity: 'success',
      })
      const jobId = workbenchEvalSkill?.id
      if (jobId) navigate(getWorkbenchJobAbsPath({ workbenchId, jobId }))
    },
    onError: (e) => popToast({ content: e.message, severity: 'danger' }),
  })

  return (
    <Button
      disabled={disabled || loading || !evalResultId}
      loading={loading}
      onClick={() => {
        if (!evalResultId) return
        workbenchEvalSkill({ variables: { id: evalResultId } })
      }}
      {...props}
    >
      Create skills from eval
    </Button>
  )
}
