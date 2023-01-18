import { Box } from 'grommet'
import { Span } from 'honorable'
import { Tab, TabList, TabPanel } from '@pluralsh/design-system'
import { useRef, useState } from 'react'

import { GqlError } from '../../utils/Alert'

import { PermissionTypes } from '../types'

import RoleFormGeneralAttributes from './RoleFormGeneralAttributes'

import RolePermissionToggle from './RolePermissionToggle'

const TABS = {
  General: { label: 'General' },
  Permissions: { label: 'Permissions' },
}

export default function RoleForm({
  error,
  attributes,
  setAttributes,
  bindings,
  setBindings,
  ...box
}): any {
  const [view, setView] = useState('General')
  const permissions = Object.entries(PermissionTypes)
  const len = permissions.length
  const tabStateRef = useRef<any>(null)

  return (
    <Box
      flex={false}
      gap="small"
      {...box}
    >
      {error && (
        <GqlError
          header="Something went wrong"
          error={error}
        />
      )}
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: view,
          onSelectionChange: key => setView(key as string),
        }}
      >
        {Object.entries(TABS).map(([key, { label }]) => (
          <Tab key={key}>{label}</Tab>
        ))}
      </TabList>
      <TabPanel stateRef={tabStateRef}>
        {view === 'General' && (
          <RoleFormGeneralAttributes
            attributes={attributes}
            setAttributes={setAttributes}
            bindings={bindings}
            setBindings={setBindings}
          />
        )}
        {view === 'Permissions' && (
          <Box gap="small">
            <Box>
              <Span fontWeight="bold">Permissions</Span>
              <Span>
                Grant permissions to all users and groups bound to this role
              </Span>
            </Box>
            <Box>
              {permissions.map(([perm, description], i) => (
                <RolePermissionToggle
                  key={perm}
                  permission={perm}
                  description={description}
                  attributes={attributes}
                  setAttributes={setAttributes}
                  first={i === 0}
                  last={i === len - 1}
                />
              ))}
            </Box>
          </Box>
        )}
      </TabPanel>
    </Box>
  )
}
