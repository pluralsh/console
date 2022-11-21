import { ListBoxItem, Select } from '@pluralsh/design-system'
import { ThemeContext } from 'grommet'
import { Div, Span } from 'honorable'
import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { getIcon, hasIcons } from '../misc'

export default function AppSelector({ applications, currentApp }) {
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
        selectedKey={currentApp.name}
        onSelectionChange={appName => navigate(`/apps/${appName}`)}
      >
        {applications.map(app => (
          <ListBoxItem
            key={app.name}
            label={(
              <>
                <Span>{app.name}</Span>
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
              </>
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
