import { Card, PageTitle } from '@pluralsh/design-system'

import { useOutletContext } from 'react-router-dom'

import Command from './Command'

export default function Progress() {
  const { edges } = useOutletContext<any>()
  const len = edges.length

  return (
    <>
      <PageTitle heading="Progress" />
      <Card
        flexGrow={1}
        fontFamily="Monument Mono"
        overflowY="auto"
      >
        {edges.map(({ node }, i) => (
          <Command
            key={node.id}
            command={node}
            follow={i === len - 1}
          />
        ))}
      </Card>
    </>
  )
}
