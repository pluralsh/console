import { Button } from '@pluralsh/design-system'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import {
  FLOW_WORKBENCHES_REL_PATH,
  getFlowDetailsPath,
} from 'routes/flowRoutesConsts'

export function FlowWorkbenchJobLauncher({
  flow,
}: {
  flow: FlowBasicWithBindingsFragment
}) {
  return (
    <Button
      as={Link}
      to={`${getFlowDetailsPath({ flowIdOrName: flow.name })}/${FLOW_WORKBENCHES_REL_PATH}`}
    >
      Start workbench job
    </Button>
  )
}
