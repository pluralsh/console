import {
  Card,
  ListBoxItem,
  PageTitle,
  Select,
} from '@pluralsh/design-system'
import { getIcon, hasIcons } from 'components/apps/misc'
import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { InstallationContext } from 'components/Installations'
import { AnsiText } from 'components/utils/AnsiText'
import { ThemeContext } from 'grommet'
import { Div, Flex } from 'honorable'
import { groupBy } from 'lodash'
import {
  Key,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

export default function Changelog() {
  const { buildId } = useParams()
  const { dark } = useContext<any>(ThemeContext)
  const { applications } = useContext<any>(InstallationContext)
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { build: { changelogs } } = useOutletContext<any>()
  const { repo: initialRepo, tool: initialTool }: any = changelogs?.length > 0 ? changelogs[0] : {}

  const [repo, setRepo] = useState<Key>(initialRepo)
  const grouped = groupBy(changelogs, ({ repo }) => repo)
  const repoNames = Object.keys(grouped)
  const repos = applications.filter(({ name }) => repoNames.includes(name))
  const currentRepo = useMemo(() => repos.find(r => r.name === repo), [repos, repo])

  const [tool, setTool] = useState<Key>(initialTool)
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
    <>
      <PageTitle heading="Changelog">
        <Select
          aria-label="app"
          label="Choose an app"
          leftContent={(!!currentRepo && hasIcons(currentRepo)) ? (
            <img
              src={getIcon(currentRepo, dark)}
              height={16}
            />
          ) : undefined}
          selectedKey={repo}
          onSelectionChange={setRepo}
        >
          {repos.map(r => (
            <ListBoxItem
              key={r.name}
              label={r.name}
              textValue={r.name}
              leftContent={hasIcons(r) ? (
                <img
                  src={getIcon(r, dark)}
                  height={16}
                />
              ) : undefined}
            />
          ))}
        </Select>
      </PageTitle>
      <Flex>
        {tools.map(({ id, tool }) => (
          <Div id={id}>
            {tool}
          </Div>
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
