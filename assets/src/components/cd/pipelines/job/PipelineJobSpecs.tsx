import { Card, Code, SubTab, TabList } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { PropWideBold } from 'components/component/info/common'

import { useNavigate, useParams } from 'react-router-dom'

import { useLayoutEffect, useRef } from 'react'

import { LinkTabWrap } from 'components/utils/Tabs'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { RawYaml } from 'components/component/ComponentRaw'

import { usePipelineJob } from './PipelineJob'

const TABS = [
  { path: '', label: 'Info', enabled: true },
  { path: 'raw', label: 'Raw', enabled: true },
]

export default function PipelineJobStatus() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { raw, spec } = usePipelineJob()
  const { tab: tabName, jobId } = useParams()
  const tabStateRef = useRef<any>(null)
  const currentTab = TABS.find((tab) => tab.path === (tabName ?? ''))

  useLayoutEffect(() => {
    if (!currentTab) {
      navigate(`${PIPELINES_ABS_PATH}/jobs/${jobId}/specs`)
    }
  }, [currentTab, jobId, navigate])
  if (!currentTab) return null

  return (
    <ScrollablePage
      heading="Specs"
      scrollable={currentTab?.path === ''}
      headingContent={
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: currentTab?.path,
          }}
        >
          {TABS.map(({ label, path }) => (
            <LinkTabWrap
              subTab
              key={path}
              textValue={label}
              to={`${PIPELINES_ABS_PATH}/jobs/${jobId}/specs/${path}`}
            >
              <SubTab
                key={path}
                textValue={label}
              >
                {label}
              </SubTab>
            </LinkTabWrap>
          ))}
        </TabList>
      }
    >
      {currentTab?.path === 'raw' && <RawYaml raw={raw} />}
      {currentTab?.path === '' && (
        <Card
          css={{
            display: 'flex',
            padding: theme.spacing.xlarge,
            gap: theme.spacing.xsmall,
            flexDirection: 'column',
          }}
        >
          <PropWideBold title="Active deadline seconds">
            {spec?.activeDeadlineSeconds || 0}
          </PropWideBold>
          <PropWideBold title="Backoff limit">
            {spec?.backoffLimit || 0}
          </PropWideBold>
          <PropWideBold title="Parallelism">
            {spec?.parallelism || 0}
          </PropWideBold>
        </Card>
      )}
    </ScrollablePage>
  )
}
