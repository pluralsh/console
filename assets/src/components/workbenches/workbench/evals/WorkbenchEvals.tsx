import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Flex } from '@pluralsh/design-system'
import { WorkbenchOutletContext } from '../Workbench'
import { WorkbenchEvalsSidePanel } from './WorkbenchEvalsSidePanel'

export function WorkbenchEvals() {
  const { workbenchId, setSideContent, setShowDescription } =
    useOutletContext<WorkbenchOutletContext>()

  useEffect(() => {
    setSideContent(<WorkbenchEvalsSidePanel workbenchId={workbenchId} />)
    setShowDescription(false)

    return () => {
      setSideContent(null)
      setShowDescription(true)
    }
  }, [setShowDescription, setSideContent, workbenchId])

  return (
    <Flex
      direction="column"
      gap="medium"
      overflowY="auto"
    >
      ...
    </Flex>
  )
}
