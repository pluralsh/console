import { Card, PageTitle } from '@pluralsh/design-system'
import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { useContext, useEffect } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import Command from './Command'

export default function Progress() {
  const { buildId } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { edges } = useOutletContext<any>()
  const len = edges.length

  useEffect(() => {
    setBreadcrumbs([
      { text: 'builds', url: '/builds' },
      { text: buildId, url: `/builds/${buildId}` },
      { text: 'progress', url: `/builds/${buildId}/progress` },
    ])
  }, [buildId, setBreadcrumbs])

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
