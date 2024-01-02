import { ListBoxItem, Select } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { toNiceVersion } from 'utils/semver'

import styled, { useTheme } from 'styled-components'

import { getIcon, hasIcons } from '../misc'

const AppSelectorSC = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.medium,
  width: 240,
}))
const AppLabelSC = styled.p((_) => ({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 140,
  whiteSpace: 'nowrap',
}))
const AppLabelVersionSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  marginLeft: theme.spacing.small,
}))

export default function AppSelector({ applications, currentApp, directory }) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const paths = directory.map(({ path }) => path).filter((path) => !!path)

  const switchApp = useCallback(
    (appName) => {
      const matches = paths.filter(
        (path) => pathname.endsWith(path) || pathname.includes(`/${path}/`)
      )
      const match = isEmpty(matches) ? '' : matches[0]

      navigate(`/apps/${appName}/${match}`)
    },
    [navigate, pathname, paths]
  )

  console.log('selectors')

  return (
    <AppSelectorSC>
      <Select
        aria-label="app"
        leftContent={
          hasIcons(currentApp) ? (
            <img
              style={{ display: 'block' }}
              src={getIcon(currentApp, theme.mode)}
              height={16}
              width={16}
            />
          ) : undefined
        }
        selectedKey={currentApp.name}
        onSelectionChange={switchApp}
      >
        {applications.map((app) => (
          <ListBoxItem
            key={app.name}
            label={
              <AppLabelSC>
                {app.name}
                {app.spec?.descriptor?.version && (
                  <AppLabelVersionSC>
                    {toNiceVersion(app.spec.descriptor.version)}
                  </AppLabelVersionSC>
                )}
              </AppLabelSC>
            }
            textValue={app.name}
            leftContent={
              hasIcons(app) ? (
                <img
                  style={{ display: 'block' }}
                  src={getIcon(app, theme.mode)}
                  height={16}
                  width={16}
                />
              ) : undefined
            }
          />
        ))}
      </Select>
    </AppSelectorSC>
  )
}
