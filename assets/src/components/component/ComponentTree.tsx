import { EmptyState, Flex } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

import { useComponentTreeQuery } from 'generated/graphql'

import { ComponentTreeGraph } from 'components/component/tree/ComponentTreeGraph'
import { GqlError } from 'components/utils/Alert'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ComponentDetailsContext } from './ComponentDetails'

export default function ComponentTree() {
  const ctx = useOutletContext<ComponentDetailsContext>()
  const component = ctx?.component
  const componentId = ctx?.component.id

  const { data, loading, error } = useComponentTreeQuery({
    variables: { id: componentId },
  })
  const tree = data?.componentTree

  if (error) return <GqlError error={error} />

  if (!tree)
    return loading ? (
      <LoadingIndicator />
    ) : (
      <EmptyState message="No data available." />
    )

  return (
    <Flex
      height="100%"
      direction="column"
    >
      <ReactFlowProvider>
        <ComponentTreeGraph
          tree={tree}
          component={component}
        />
      </ReactFlowProvider>
    </Flex>
  )
}
