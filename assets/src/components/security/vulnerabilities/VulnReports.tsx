import {
  Chip,
  ChipProps,
  FillLevelProvider,
  Flex,
  Input,
  SearchIcon,
  SubTab,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { ClusterSelect } from 'components/cd/utils/ClusterSelect'
import { useThrottle } from 'components/hooks/useThrottle'
import { useClusters, useNamespaces } from 'components/kubernetes/Cluster'
import { NamespaceMultiSelect } from 'components/kubernetes/common/NamespaceMultiSelect'
import {
  useVulnerabilityStatisticsQuery,
  VulnReportGrade,
} from 'generated/graphql'
import { ComponentProps, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { VulneratbilityReportsTable } from './VulnReportsTable'
import {
  SECURITY_REL_PATH,
  SECURITY_ABS_PATH,
  VULNERABILITY_REPORTS_ABS_PATH,
  VULNERABILITY_REPORTS_REL_PATH,
} from 'routes/securityRoutesConsts'

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  {
    label: VULNERABILITY_REPORTS_REL_PATH,
    url: VULNERABILITY_REPORTS_ABS_PATH,
  },
]

export const gradeToSeverityMap: Record<
  VulnReportGrade | 'All',
  ChipProps['severity']
> = {
  [VulnReportGrade.A]: 'success',
  [VulnReportGrade.B]: 'neutral',
  [VulnReportGrade.C]: 'warning',
  [VulnReportGrade.D]: 'danger',
  [VulnReportGrade.F]: 'critical',
  All: 'neutral',
}

export function VulnerabilityReports() {
  useSetBreadcrumbs(breadcrumbs)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { clusterId = '' } = useParams()
  const selectedClusters = useMemo(() => [clusterId], [clusterId])

  const clusters = useClusters()
  const namespaces = useNamespaces()

  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([])
  const [selectedGrade, setSelectedGrade] = useState<VulnReportGrade | 'All'>(
    'All'
  )
  const [reportsQ, setReportsQ] = useState('')
  const throttledReportsQ = useThrottle(reportsQ, 300)

  const { data: statsData } = useVulnerabilityStatisticsQuery({
    variables: {
      clusters: selectedClusters,
      namespaces: selectedNamespaces,
      q: throttledReportsQ,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000,
  })

  const gradeToCountMap = statsData?.vulnerabilityStatistics?.reduce(
    (acc, curr) => {
      if (!curr) return acc
      acc[curr.grade] = curr.count
      acc.total += curr.count
      return acc
    },
    { total: 0 }
  ) ?? { total: 0 }

  const header = useMemo(
    () => (
      <Flex gap="medium">
        <ClusterSelect
          clusters={clusters}
          selectedKey={clusterId}
          onSelectionChange={(id) =>
            navigate(pathname.replace(clusterId, id as string))
          }
          withoutTitleContent
        />
        <NamespaceMultiSelect
          allNamespaces={namespaces}
          selectedNamespaces={selectedNamespaces}
          setSelectedNamespaces={setSelectedNamespaces}
        />
      </Flex>
    ),
    [clusterId, clusters, namespaces, navigate, pathname, selectedNamespaces]
  )
  useSetPageHeaderContent(header)

  return (
    <ContentWrapperSC>
      <FiltersWrapperSC>
        <Input
          flex={1}
          startIcon={<SearchIcon color="icon-light" />}
          placeholder="Search vulnerability reports"
          value={reportsQ}
          onChange={(e) => setReportsQ(e.target.value)}
        />
        <Flex>
          <FillLevelProvider value={1}>
            <GradeSelectSubtab
              grade="All"
              count={gradeToCountMap.total}
              active={selectedGrade === 'All'}
              onClick={() => setSelectedGrade('All')}
            />
            {Object.values(VulnReportGrade).map((grade) => (
              <GradeSelectSubtab
                key={grade}
                grade={grade}
                count={gradeToCountMap[grade] ?? 0}
                active={selectedGrade === grade}
                onClick={() => setSelectedGrade(grade)}
              />
            ))}
          </FillLevelProvider>
        </Flex>
      </FiltersWrapperSC>
      <VulneratbilityReportsTable
        selectedClusters={selectedClusters}
        selectedNamespaces={selectedNamespaces}
        selectedGrade={selectedGrade === 'All' ? undefined : selectedGrade}
        reportsQ={throttledReportsQ}
      />
    </ContentWrapperSC>
  )
}

function GradeSelectSubtab({
  grade,
  count,
  ...props
}: {
  grade: VulnReportGrade | 'All'
  count: number
} & ComponentProps<typeof SubTab>) {
  const theme = useTheme()
  return (
    <SubTab {...props}>
      <Flex
        gap="small"
        align="center"
      >
        {grade}
        <Chip
          condensed
          size="small"
          severity={count ? gradeToSeverityMap[grade] : 'neutral'}
        >
          <span
            css={{
              color: count ? undefined : theme.colors['text-xlight'],
              display: 'contents',
            }}
          >
            {count}
          </span>
        </Chip>
      </Flex>
    </SubTab>
  )
}

const ContentWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
  overflow: 'hidden',
}))

const FiltersWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  width: '100%',
}))
