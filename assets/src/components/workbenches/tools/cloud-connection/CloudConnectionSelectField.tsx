import {
  FormField,
  ListBoxFooter,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Provider, useCloudConnectionsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CLOUD_CONNECTION_SELECTED_QUERY_PARAM,
  WORKBENCHES_TOOLS_CREATE_CLOUD_CONNECTION_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { PROVIDER_TO_ICON, PROVIDER_TO_LABEL } from '../workbenchToolsUtils'

export function CloudConnectionSelectField({
  provider,
  selectedId,
  onChange,
}: {
  provider: Provider
  selectedId: Nullable<string>
  onChange: (id: string | null) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  const { data, loading } = useCloudConnectionsQuery({
    variables: { first: 100, provider },
    fetchPolicy: 'cache-and-network',
  })

  const connections = useMemo(
    () => mapExistingNodes(data?.cloudConnections),
    [data]
  )

  // auto-select the newly-created connection when returning from the sub-wizard
  useEffect(() => {
    const selectedParam = searchParams.get(
      CLOUD_CONNECTION_SELECTED_QUERY_PARAM
    )
    if (!selectedParam) return
    onChange(selectedParam)
    const next = new URLSearchParams(searchParams)
    next.delete(CLOUD_CONNECTION_SELECTED_QUERY_PARAM)
    setSearchParams(next, { replace: true })
  }, [onChange, searchParams, setSearchParams])

  const ProviderIcon = PROVIDER_TO_ICON[provider]
  const selectedConnection = connections.find((c) => c.id === selectedId)

  return (
    <FormField
      required
      label={`${PROVIDER_TO_LABEL[provider]} connection`}
      hint="Select an existing cloud connection or create a new one."
      caption={
        <InlineLink
          as={Link}
          to={{
            pathname: WORKBENCHES_TOOLS_CREATE_CLOUD_CONNECTION_ABS_PATH,
            search: `?provider=${provider}`,
          }}
        >
          Create new {PROVIDER_TO_LABEL[provider]} connection
        </InlineLink>
      }
    >
      <Select
        selectedKey={selectedId || null}
        leftContent={
          selectedConnection ? <ProviderIcon fullColor /> : undefined
        }
        onSelectionChange={(key) => onChange(key ? String(key) : null)}
        label="Cloud connection"
        {...(isEmpty(connections) &&
          (loading
            ? {
                isDisabled: true,
                triggerButton: (
                  <RectangleSkeleton
                    $bright
                    $height="xlarge"
                    $width="100%"
                  />
                ),
              }
            : {
                dropdownFooter: (
                  <ListBoxFooter>
                    No {PROVIDER_TO_LABEL[provider]} connections found
                  </ListBoxFooter>
                ),
              }))}
      >
        {[
          ...connections.map((c) => (
            <ListBoxItem
              key={c.id}
              leftContent={<ProviderIcon fullColor />}
              label={c.name}
            />
          )),
        ]}
      </Select>
    </FormField>
  )
}
