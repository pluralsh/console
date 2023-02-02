import { ListBoxItem, Select } from '@pluralsh/design-system'
import { Div, P, Span } from 'honorable'
import { isEmpty } from 'lodash'
import {
  Key,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getIcon, hasIcons } from '../misc'

import { getDirectory } from './App'

export default function AppSelector({ applications, currentApp }) {
  const [selectedKey, setSelectedKey] = useState<Key>(currentApp.name)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const paths = useMemo(() => getDirectory().map(({ path }) => path), [])

  const switchApp = useCallback(appName => {
    const matches = paths.filter(path => pathname.endsWith(path))
    const match = isEmpty(matches) ? '' : matches[0]

    setSelectedKey(appName)
    navigate(`/apps/${appName}/${match}`)
  }, [navigate, pathname, paths])

  useEffect(() => setSelectedKey(currentApp.name), [currentApp])

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
            src={getIcon(currentApp)}
            height={16}
          />
        ) : undefined}
        width={240}
        selectedKey={selectedKey}
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
                src={getIcon(app)}
                height={16}
              />
            ) : undefined}
          />
        ))}
      </Select>
    </Div>
  )
}
