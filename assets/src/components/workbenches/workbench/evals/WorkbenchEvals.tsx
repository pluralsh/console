import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Flex } from '@pluralsh/design-system'
import { WorkbenchOutletContext } from '../Workbench'
import { WorkbenchEvalsSidePanel } from './WorkbenchEvalsSidePanel'
import { useTheme } from 'styled-components'

export function WorkbenchEvals() {
  const theme = useTheme()
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
      css={{
        borderTop: theme.borders['fill-one'],
        padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
      }}
    >
      ...
    </Flex>
  )
}
