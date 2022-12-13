import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { AnsiText } from 'components/utils/AnsiText'
import { SidebarTab } from 'components/utils/SidebarTab'
import { Box } from 'grommet'
import { groupBy } from 'lodash'
import { useContext, useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

const SIDEBAR_WIDTH = '150px'

function ChangelogRepo({
  repo, current, setRepo, tools, tool, setTool,
}) {
  return (
    <SidebarTab
      tab={current}
      subtab={tool}
      setTab={setRepo}
      setSubTab={setTool}
      name={repo}
      subnames={tools.map(({ tool: t }) => t)}
    />
  )
}

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

  useEffect(() => {
    setBreadcrumbs([
      { text: 'Builds', url: '/builds' },
      { text: buildId, url: `/builds/${buildId}` },
      { text: 'Changelog', url: `/builds/${buildId}/changelog` },
    ])
  }, [buildId, setBreadcrumbs])

  return (
    <Box
      fill
      direction="row"
    >
      <Box
        flex={false}
        width={SIDEBAR_WIDTH}
        height="100%"
        border="right"
      >
        {Object.entries(grouped).map(([r, tools], i) => (
          <ChangelogRepo
            repo={r}
            current={repo}
            tools={tools}
            tool={tool}
            setRepo={setRepo}
            setTool={setTool}
            key={i}
          />
        ))}
      </Box>
      <Box
        style={{ overflow: 'auto' }}
        fill
        background="backgroundColor"
        pad="small"
      >
        {selected && <AnsiText text={selected.content} />}
      </Box>
    </Box>
  )
}
