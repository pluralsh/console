import {
  Breadcrumb,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Key, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { APPLICATION_Q } from 'components/graphql/plural'
import { Flex, Span } from 'honorable'
import { COMPONENT_LABEL } from 'components/cluster/constants'
import { useQuery } from '@apollo/client'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ConfigType } from './misc'
import { ConfigurationEditor } from './ConfigurationEditor'
import { ConfigurationSettings } from './ConfigurationSettings'

export default function Configuration() {
  const tabStateRef = useRef<any>(null)
  const [view, setView] = useState<Key>()
  const { appName } = useParams()
  const { data, error } = useQuery(APPLICATION_Q, {
    variables: { name: appName },
    fetchPolicy: 'network-only',
    onError: console.error,
  })
  const breadcrumbs: Breadcrumb[] = useMemo(
    () => [
      { label: 'apps', url: '/' },
      { label: appName ?? '', url: `/apps/${appName}` },
      { label: 'configuration', url: `/apps/${appName}/config` },
    ],
    [appName]
  )

  useSetBreadcrumbs(breadcrumbs)

  if (error)
    return (
      <ScrollablePage heading="Configuration">
        Cannot access configuration for this app.
      </ScrollablePage>
    )

  if (!data) return <LoadingIndicator />

  const { application, configurationOverlays } = data
  const overlays = configurationOverlays
    ?.map(({ metadata, ...rest }) => {
      const labels = metadata.labels.reduce(
        (acc, { name, value }) => ({ ...acc, [name]: value }),
        {}
      )

      return { ...rest, metadata: { ...metadata, labels } }
    })
    .filter(({ metadata: { labels } }) => !labels[COMPONENT_LABEL])
  const views =
    overlays?.length > 0
      ? Object.keys(ConfigType)
      : Object.keys(ConfigType).filter((key) => key !== ConfigType.SETTINGS)

  if (!view) setView(views[0])

  return (
    <ScrollablePage
      scrollable={view === ConfigType.SETTINGS}
      heading="Configuration"
      headingContent={
        <>
          <Flex grow={1} />
          <TabList
            gap="xxsmall"
            margin={1}
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: view,
              onSelectionChange: setView,
            }}
          >
            {views.map((view) => (
              <SubTab
                key={view}
                textValue={view}
              >
                <Span
                  fontWeight={600}
                  textTransform="capitalize"
                >
                  {view.toLowerCase()}
                </Span>
              </SubTab>
            ))}
          </TabList>
        </>
      }
    >
      {view === ConfigType.SETTINGS && (
        <ConfigurationSettings
          application={application}
          overlays={overlays}
        />
      )}
      {(view === ConfigType.HELM || view === ConfigType.TERRAFORM) && (
        <ConfigurationEditor
          application={application}
          type={view}
        />
      )}
    </ScrollablePage>
  )
}
