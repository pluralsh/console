import { ListBoxItem, Select } from '@pluralsh/design-system'
import { Div, P, Span } from 'honorable'
import { isEmpty } from 'lodash'
import { memo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getIcon, hasIcons } from '../misc'

export default function AppSelector({ applications, currentApp, directory }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const paths = directory.map(({ path }) => path).filter(path => !!path)

  const switchApp = useCallback(appName => {
    console.log('selection changled', appName)
    const matches = paths.filter(path => pathname.endsWith(path) || pathname.includes(`/${path}/`))
    const match = isEmpty(matches) ? '' : matches[0]

    navigate(`/apps/${appName}/${match}`)
  },
  [navigate, pathname, paths])

  return (
    <Div
      marginBottom="medium"
      width={240}
    >
      <Select
        aria-label="app"
        leftContent={
          hasIcons(currentApp) ? (
            <img
              style={{ display: 'block' }}
              src={getIcon(currentApp)}
              height={16}
              width={16}
            />
          ) : undefined
        }
        selectedKey={currentApp.name}
        onSelectionChange={switchApp}
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
                {app.spec?.descriptor?.version && (
                  <Span
                    caption
                    color="text-xlight"
                    marginLeft="small"
                  >
                    {app.spec.descriptor.version}
                  </Span>
                )}
              </P>
            )}
            textValue={app.name}
            leftContent={hasIcons(app) ? (
              <img
                style={{ display: 'block' }}
                src={getIcon(app)}
                height={16}
                width={16}
              />
            ) : undefined}

          />
        ))}
      </Select>
    </Div>
  )
}
