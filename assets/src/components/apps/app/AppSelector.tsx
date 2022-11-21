import { AppIcon, ListBoxItem, Select } from '@pluralsh/design-system'
import { InstallationContext } from 'components/Installations'
import { ThemeContext } from 'grommet'
import { Div } from 'honorable'
import { useContext } from 'react'

import { getIcon, hasIcons } from '../misc'

export default function AppSelector() {
  const { applications, currentApplication }: any = useContext(InstallationContext)
  const { dark }: any = useContext(ThemeContext)

  return (
    <Div
      marginTop="xxxsmall"
      marginBottom="large"
      width={240}
    >
      <Select
        aria-label="app"
        leftContent={hasIcons(currentApplication) ? (
          <img
            src={getIcon(currentApplication, dark)}
            height={16}
          />
        ) : undefined}
        width={240}
        selectedKey={currentApplication.name}
      >
        {applications.map(app => (
          <ListBoxItem
            key={app.name}
            label={app.name}
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
