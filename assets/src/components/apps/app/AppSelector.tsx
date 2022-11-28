import { ListBoxItem, Select } from '@pluralsh/design-system'
import { ThemeContext } from 'grommet'
import { Div, P, Span } from 'honorable'
import { Key, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getIcon, hasIcons } from '../misc'

export default function AppSelector({ applications, currentApp }) {
  const [selectedKey, setSelectedKey] = useState<Key>(currentApp.name)
  const { dark }: any = useContext(ThemeContext)
  const navigate = useNavigate()

  return (
    <Div
      marginTop="xxxsmall"
      marginBottom="large"
      width={240}
    >
      <Select
        aria-label="app"
        leftContent={hasIcons(currentApp) ? (
          <img
            src={getIcon(currentApp, dark)}
            height={16}
          />
        ) : undefined}
        width={240}
        selectedKey={selectedKey}
        onSelectionChange={appName => {
          setSelectedKey(appName)
          navigate(`/apps/${appName}`)
        }}
      >
        {applications.map(app => (
          <ListBoxItem
            key={app.name}
            label={(
              <P
                overflow="hidden"
                textOverflow="ellipsis"
                maxWidth={140}
                whiteSpace="nowrap"
              >
                {app.name}
                {app.spec?.descriptor?.version
                && (
                  <Span
                    caption
                    color="text-xlight"
                    marginLeft="small"
                  >
                    v{app.spec.descriptor.version}
                  </Span>
                )}
              </P>
            )}
            textValue={app.name}
            leftContent={hasIcons(app) ? (
              <img
                src={getIcon(app, dark)}
                height={16}
              />
            ) : undefined}
          />
        ))}
      </Select>
    </Div>
  )
}
