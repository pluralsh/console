import { Card } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useOutletContext } from 'react-router-dom'

import Command from './Command'

export default function Progress() {
  const { edges } = useOutletContext<any>()
  const len = edges.length

  return (
    <ScrollablePage
      scrollable={false}
      heading="Progress"
    >
      <Card
        flexGrow={1}
        fontFamily="Monument Mono"
        overflowY="auto"
        maxHeight="100%"
      >
        {edges.map(({ node }, i) => (
          <Command
            key={node.id}
            command={node}
            follow={i === len - 1}
          />
        ))}
      </Card>
    </ScrollablePage>
  )
}
