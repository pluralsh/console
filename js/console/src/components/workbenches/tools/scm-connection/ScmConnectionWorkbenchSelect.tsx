import {
  FormField,
  ListBoxFooter,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { ScmType, useScmConnectionsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { mapExistingNodes } from 'utils/graphql'

const NONE_KEY = '__none__'

export function ScmConnectionWorkbenchSelect({
  scmType,
  toolLabel,
  selectedId,
  onChange,
}: {
  scmType: ScmType
  toolLabel: string
  selectedId: Nullable<string>
  onChange: (id: string | null) => void
}) {
  const { data, loading } = useScmConnectionsQuery({
    variables: { first: 100, type: scmType },
    fetchPolicy: 'cache-and-network',
  })

  const connections = mapExistingNodes(data?.scmConnections)

  const selectedInList =
    !!selectedId && connections.some((c) => c.id === selectedId)
  const orphanSelected = !!selectedId && !loading && !selectedInList

  const selectedKey = !selectedId
    ? NONE_KEY
    : selectedInList || loading || orphanSelected
      ? selectedId
      : NONE_KEY

  return (
    <FormField
      label="Registered SCM connection"
      hint={`Optional. When set, this ${toolLabel} tool uses that connection's credentials (and URL where applicable) instead of the manual fields below. Results are filtered to this SCM type on the server.`}
    >
      <Select
        selectionMode="single"
        selectedKey={selectedKey}
        onSelectionChange={(key) => {
          if (typeof key !== 'string' || key === NONE_KEY) {
            onChange(null)
            return
          }
          onChange(key)
        }}
        label="SCM connection"
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
                    No {toolLabel} SCM connections found
                  </ListBoxFooter>
                ),
              }))}
      >
        {[
          <ListBoxItem
            key={NONE_KEY}
            label="None (manual configuration only)"
          />,
          ...(orphanSelected && selectedId
            ? [
                <ListBoxItem
                  key={selectedId}
                  label="Previously selected connection is missing or not this type"
                />,
              ]
            : []),
          ...connections.map((c) => (
            <ListBoxItem
              key={c.id}
              label={c.name}
            />
          )),
        ]}
      </Select>
    </FormField>
  )
}
