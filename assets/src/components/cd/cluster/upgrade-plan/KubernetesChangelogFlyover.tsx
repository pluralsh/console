import {
  ArrowTopRightIcon,
  Card,
  Flex,
  Flyover,
  KubernetesIcon,
  Markdown,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import ejs from 'ejs'
import {
  ClusterOverviewDetailsFragment,
  KubernetesChangelogFragment,
} from 'generated/graphql'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { toNiceVersion } from 'utils/semver'
import changelogTemplate from './kubernetes-changelog-markdown.ejs?raw'

const getPublicChangelogUrl = (version: string) =>
  `https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-${version}.md`

export function KubernetesChangelogFlyover({
  open,
  onClose,
  cluster,
  kubernetesChangelog,
}: {
  open: boolean
  onClose: () => void
  cluster: ClusterOverviewDetailsFragment
  kubernetesChangelog: KubernetesChangelogFragment
}) {
  const { colors, spacing } = useTheme()
  return (
    <FlyoverSC
      open={open}
      onClose={onClose}
      width="50%"
      minWidth={630}
      header={
        <span>
          <KubernetesIcon /> Kubernetes changelog{' '}
          {toNiceVersion(kubernetesChangelog?.version)}
        </span>
      }
      css={{ background: colors['fill-one'] }}
    >
      <Table
        hideHeader
        fillLevel={1}
        data={[cluster]}
        reactTableOptions={{ meta: { kubernetesChangelog } }}
        columns={headerTableCols}
        padding={spacing.medium}
      />
      <MdWrapperCardSC>
        <Markdown
          text={ejs.render(changelogTemplate, { kubernetesChangelog }).trim()}
          components={{ hr: ChangelogHrSC }}
        />
      </MdWrapperCardSC>
    </FlyoverSC>
  )
}

const columnHelper = createColumnHelper<ClusterOverviewDetailsFragment>()
const headerTableCols = [
  columnHelper.accessor(({ name }) => name, {
    id: 'cluster',
    cell: ({ getValue }) => (
      <StackedText
        first="Cluster"
        firstPartialType="caption"
        firstColor="text-xlight"
        second={getValue()}
        secondPartialType="body2"
        secondColor="text"
      />
    ),
  }),
  columnHelper.accessor((cluster) => cluster?.currentVersion, {
    id: 'version',
    cell: ({ getValue }) => (
      <StackedText
        first="Current version"
        firstPartialType="caption"
        firstColor="text-xlight"
        second={toNiceVersion(getValue())}
        secondPartialType="body2"
        secondColor="text"
      />
    ),
  }),
  columnHelper.display({
    id: 'public-changelog',
    cell: function Cell({ table: { options } }) {
      const version = (
        options.meta
          ?.kubernetesChangelog as Nullable<KubernetesChangelogFragment>
      )?.version
      if (!version) return null
      return (
        <StackedText
          first="Public changelog"
          firstPartialType="caption"
          firstColor="text-xlight"
          second={
            <InlineLink
              as={Link}
              target="_blank"
              rel="noopener noreferrer"
              to={getPublicChangelogUrl(version)}
            >
              <Flex
                align="center"
                gap="xxsmall"
              >
                {toNiceVersion(version)} <ArrowTopRightIcon />
              </Flex>
            </InlineLink>
          }
          secondPartialType="body2"
          secondColor="text"
        />
      )
    },
  }),
]

const FlyoverSC = styled(Flyover)(({ theme }) => ({
  background: theme.colors['fill-one'],
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

const MdWrapperCardSC = styled(Card)(({ theme }) => ({
  padding: `${theme.spacing.large}px ${theme.spacing.medium}px`,
  background: theme.colors['fill-accent'],
  border: theme.borders.default,
  overflow: 'auto',
}))

const ChangelogHrSC = styled.hr(({ theme }) => ({
  height: '1px',
  backgroundColor: theme.colors.border,
  border: 0,
  margin: `${theme.spacing.medium}px 0 0`,
}))
