import styled, { useTheme } from 'styled-components'
import { createElement } from 'react'

import * as icons from '../icons'

export default {
  title: 'Icons',
  component: icons.MarketPlusIcon,
  argTypes: {
    color: {
      options: [
        'icon-default',
        'icon-light',
        'icon-xlight',
        'icon-disabled',
        'icon-primary',
        'icon-secondary',
        'icon-info',
        'icon-success',
        'icon-warning',
        'icon-danger',
        'icon-danger-critical',
      ],
      control: {
        type: 'select',
      },
    },
  },
}

const AppIcon = styled.div<{ $backgroundColor: string }>(
  ({ theme, $backgroundColor = 'transparent' }) => ({
    margin: theme.spacing.xxxsmall,
    paddingTop: theme.spacing.medium,
    paddingBottom: theme.spacing.xsmall,
    paddingRight: theme.spacing.xsmall,
    paddingLeft: theme.spacing.xsmall,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadiuses.medium,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: theme.spacing.xxxlarge,
    hyphens: 'none',
    wordBreak: 'break-all',
    fontSize: '0.75rem',
    minWidth: '8em',
    textAlign: 'center',
    ...theme.partials.text.caption,
    backgroundColor: $backgroundColor,
  })
)

function Template({ backgroundColor, ...args }: any) {
  const theme = useTheme()
  const bgColor =
    (typeof (theme.colors as any)[backgroundColor] === 'string' &&
      (theme.colors as any)[backgroundColor]) ||
    backgroundColor

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        maxWidth: '100%',
      }}
    >
      {Object.entries(icons).map(([name, icon]) => (
        <AppIcon
          key={name}
          $backgroundColor={bgColor}
        >
          <div style={{ justifySelf: 'flex-end' }}>
            {createElement(icon as any, { ...args })}
          </div>
          <span
            dangerouslySetInnerHTML={{
              __html: name
                .replace('Icon', '')
                .replaceAll(/([a-z])([A-Z])/g, '$1&shy;$2'),
            }}
          />
        </AppIcon>
      ))}
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {
  color: 'icon-default',
  size: 16,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Xlarge = Template.bind({})
Xlarge.args = {
  color: 'icon-default',
  size: 32,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Large = Template.bind({})
Large.args = {
  color: 'icon-default',
  size: 24,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Small = Template.bind({})
Small.args = {
  color: 'icon-default',
  size: 12,
  fullColor: false,
  backgroundColor: 'transparent',
}

export const Color = Template.bind({})
Color.args = {
  color: 'icon-primary',
  fullColor: false,
  size: 16,
  backgroundColor: 'transparent',
}

export const FullColor = Template.bind({})
FullColor.args = {
  color: 'icon-default',
  fullColor: true,
  size: 32,
  backgroundColor: 'transparent',
}
