import { SelectButton, WorkbenchIcon } from '@pluralsh/design-system'
import {
  borderShimmerStyles,
  useBorderShimmer,
} from 'components/utils/borderShimmer'
import {
  HEADER_WORKBENCH_SELECTOR_WIDTH,
  WorkbenchSelector,
} from 'components/workbenches/WorkbenchSelector'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

export function HeaderWorkbenchSelect() {
  const navigate = useNavigate()
  const params = useParams()
  const { workbenches, hasWorkbenches, loading } = useWorkbenchOptions()
  const showAnimation = useBorderShimmer({
    enabled: !loading && hasWorkbenches,
  })
  const routeWorkbenchId = params[WORKBENCH_PARAM_ID]
  const selectedWorkbenchId = workbenches.some(
    (workbench) => workbench.id === routeWorkbenchId
  )
    ? (routeWorkbenchId ?? null)
    : null

  if (loading || !hasWorkbenches) return null

  return (
    <HeaderWorkbenchSelectSC>
      <WorkbenchSelector
        workbenchId={selectedWorkbenchId}
        setWorkbenchId={(id) => {
          if (id) navigate(getWorkbenchAbsPath(id))
        }}
        workbenches={workbenches}
        loading={false}
        width={HEADER_WORKBENCH_SELECTOR_WIDTH}
        maxHeight={360}
        triggerButton={
          <HeaderWorkbenchSelectButtonSC
            size="small"
            showArrow={false}
            $showAnimation={showAnimation}
            leftContent={<WorkbenchIcon size={12} />}
          >
            Workbenches
          </HeaderWorkbenchSelectButtonSC>
        }
      />
    </HeaderWorkbenchSelectSC>
  )
}

const HeaderWorkbenchSelectSC = styled.div({
  flexShrink: 0,
  width: 'fit-content',
})

const HeaderWorkbenchSelectButtonSC = styled(SelectButton)<{
  $showAnimation: boolean
}>(({ theme, $showAnimation }) => ({
  width: 'auto',
  flexShrink: 0,
  '.leftContent': { marginRight: theme.spacing.xsmall },
  ...borderShimmerStyles({
    theme,
    showAnimation: $showAnimation,
    fillColor:
      theme.mode === 'light'
        ? theme.colors['fill-zero']
        : theme.colors['fill-one'],
  }),
}))
