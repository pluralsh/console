import { Card, SubTab, TabList } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { PropWideBold } from 'components/component/info/common'

import { useNavigate, useParams } from 'react-router-dom'

import { useLayoutEffect, useRef, useState } from 'react'

import { LinkTabWrap } from 'components/utils/Tabs'

import { RawYaml } from 'components/component/ComponentRaw'

import { getStackRunsAbsPath } from '../../../../routes/stacksRoutesConsts'

import { useRunJob } from './RunJob'

const TABS = [
  { path: '', label: 'Info' },
  { path: 'raw', label: 'Raw' },
]

export default function RunJobSpecs() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { raw, spec } = useRunJob()
  const { tab: tabName, jobId, stackId, runId } = useParams()
  const tabStateRef = useRef<any>(null)
  const currentTab = TABS.find((tab) => tab.path === (tabName ?? ''))
  const pathPrefix = `${getStackRunsAbsPath(stackId, runId)}/job/specs`

  useLayoutEffect(() => {
    if (!currentTab) navigate(`${pathPrefix}/specs`)
  }, [currentTab, jobId, navigate, pathPrefix])

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
              to={`${pathPrefix}/${path}`}
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
      {currentTab.path === 'raw' ? (
        <RawYaml raw={raw} />
      ) : (
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
