import { Card, PageTitle } from '@pluralsh/design-system'
import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { AnsiText } from 'components/utils/AnsiText'
import { SidebarTab } from 'components/utils/SidebarTab'
import { Flex } from 'honorable'
import { groupBy } from 'lodash'
import { useContext, useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

export default function Changelog() {
  const { buildId } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { build: { changelogs } } = useOutletContext<any>()
  const { repo: initialRepo, tool: initialTool }: any = changelogs?.length > 0 ? changelogs[0] : {}
  const [repo, setRepo] = useState(initialRepo)
  const [tool, setTool] = useState(initialTool)
  const grouped = groupBy(changelogs, ({ repo }) => repo)
  const tools = grouped[repo] || []
  const selected = tools.find(({ tool: t }) => t === tool)

  console.log(changelogs)

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Builds', url: '/builds' },
      { text: buildId, url: `/builds/${buildId}` },
      { text: 'Changelog', url: `/builds/${buildId}/changelog` },
    ])
  }, [buildId, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Changelog" />
      <Flex>
        {Object.entries(grouped).map(([r, tools], i) => (
          <SidebarTab
            key={i}
            tab={repo}
            subtab={tool}
            setTab={setRepo}
            setSubTab={setTool}
            name={r}
            subnames={tools.map(({ tool: t }) => t)}
          />
        ))}
      </Flex>
      {selected && (
        <Card
          marginVertical="medium"
          padding="small"
          flexGrow={1}
          flexShrink={1}
          overflowY="auto"
        >
          <AnsiText text={selected.content} />
        </Card>
      ) }
    </>
  )
}
