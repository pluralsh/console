import {
  ListBoxItem,
  Select,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  Key,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Div, Flex, H3 } from 'honorable'

import { DURATIONS, SECOND_TO_MILLISECONDS } from 'utils/time'

import { RUNBOOKS_Q, RUNBOOK_Q } from 'components/runbooks/queries'

import { RunbookDisplay } from 'components/apps/app/runbooks/runbook/RunbookDisplay'

import { RunbookExecutions } from 'components/apps/app/runbooks/runbook/RunbookExecutions'

import { Portal } from 'react-portal'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useTheme } from 'styled-components'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import RangePicker from '../../../../utils/RangePicker'
import { PageTitleSelectButton } from '../../../../utils/PageTitleSelectButton'

import { RunbookAlerts } from './RunbookAlerts'

const DIRECTORY = [
  { key: 'runbook', label: 'Runbook' },
  { key: 'executions', label: 'Executions' },
]

export const ActionContext = createContext<any>({})

export function ActionPortal({ children }) {
  const { ref } = useContext(ActionContext)

  return <Portal node={ref}>{children}</Portal>
}
function ActionContainer() {
  const { setRef } = useContext(ActionContext)

  return (
    <Div
      ref={setRef}
      flex={false}
    />
  )
}

export default function Runbook() {
  const navigate = useNavigate()
  const [ref, setRef] = useState(null)
  const tabStateRef = useRef<any>(null)
  const { appName, runbookName } = useParams()
  const [duration, setDuration] = useState(DURATIONS[0])
  const { setRunbook } = useOutletContext<any>()
  const theme = useTheme()
  const prevData = useRef()

  const result = useQuery(RUNBOOK_Q, {
    variables: {
      namespace: appName,
      name: runbookName,
      context: {
        timeseriesStart: -duration.offset,
        timeseriesStep: duration.step,
      },
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: SECOND_TO_MILLISECONDS * 30,
  })
  const { refetch, loading } = result

  /* Apollo returns undefined data intially when changing duration for some reason,
  so this cache prevent full page reload while waiting for new data */
  const data = result.data || (loading ? prevData.current : undefined)

  prevData.current = data

  const { data: runbooksData } = useQuery(RUNBOOKS_Q, {
    variables: { namespace: appName },
    fetchPolicy: 'cache-and-network',
    pollInterval: SECOND_TO_MILLISECONDS * 30,
  })

  const [selectedKey, setSelectedKey] = useState<Key>('')
  const [selectedTab, setSelectedTab] = useState<any>('audit-logs')

  const breadcrumbs = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'runbooks', url: `/apps/${appName}/runbooks` },
      {
        label: data?.runbook?.spec?.name ?? '',
        url: `/apps/${appName}/runbooks/${data?.runbook?.name}`,
      },
    ],
    [appName, data?.runbook]
  )

  useSetBreadcrumbs(breadcrumbs)

  useEffect(() => setSelectedKey(data?.runbook?.spec?.name || ''), [data])

  if (!data || !runbooksData) return <LoadingIndicator />

  const { runbook } = data
  const { runbooks } = runbooksData

  setRunbook(runbook)

  return (
    <ScrollablePage
      scrollable={selectedTab !== 'executions'}
      heading={
        <div>
          {/* @ts-ignore */}
          <Select
            aria-label="dashboards"
            selectedKey={selectedKey}
            onSelectionChange={(name) =>
              navigate(`/apps/${appName}/runbooks/${name}`)
            }
            triggerButton={
              <PageTitleSelectButton
                title="Runbooks"
                label={selectedKey}
              />
            }
            width={240}
          >
            {runbooks.map((runbook) => (
              <ListBoxItem
                key={runbook.name}
                label={runbook.spec.name}
                textValue={runbook.name}
              />
            ))}
          </Select>
        </div>
      }
      headingContent={
        <TabList
          gap="xxsmall"
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: selectedTab,
            onSelectionChange: (key) => {
              setSelectedTab(key)
              refetch()
            },
          }}
        >
          {DIRECTORY.map(({ label, key }) => (
            <SubTab
              key={key}
              textValue={label}
            >
              {label}
            </SubTab>
          ))}
        </TabList>
      }
    >
      {selectedTab === 'runbook' && (
        // eslint-disable-next-line react/jsx-no-constructed-context-values
        <ActionContext.Provider value={{ ref, setRef }}>
          <Flex
            direction="column"
            gap="xxlarge"
          >
            <div>
              <H3 subtitle1>Scaling</H3>
              <Flex
                direction="row"
                gap="medium"
                wrap="wrap"
                paddingTop="medium"
                paddingBottom="medium"
                position="sticky"
                top={-theme.spacing.xxxsmall}
                backgroundColor="fill-zero"
                zIndex={10}
              >
                <RangePicker
                  duration={duration}
                  setDuration={setDuration}
                />
                <Flex grow={1} />
                <ActionContainer />
              </Flex>
              <RunbookDisplay
                root={runbook.spec.display}
                data={runbook.data}
              />
            </div>
            {runbook?.status?.alerts?.length > 0 && (
              <div>
                <H3
                  subtitle1
                  marginBottom="medium"
                >
                  Alerts
                </H3>
                <RunbookAlerts alerts={runbook.status.alerts} />
              </div>
            )}
          </Flex>
        </ActionContext.Provider>
      )}
      {selectedTab === 'executions' && <RunbookExecutions />}
    </ScrollablePage>
  )
}
