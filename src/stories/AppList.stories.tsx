import styled from 'styled-components'

import {
  AppList,
  AppProps,
  ArrowTopRightIcon,
  Button,
  Card,
  CardProps,
  GitLabLogoIcon,
} from '..'

export default {
  title: 'AppList',
  component: AppList,
  argTypes: {
  },
}

const APPS: Array<AppProps & CardProps> = [
  {
    promoted: true,
    name: 'Console',
    description: 'Manage your cluster and applications.',
    logoUrl: 'logos/console-logo.png',
    primaryAction: (
      <Button
        minHeight={32}
        height={32}
      >
        <div style={{ marginRight: '8px' }}>Launch</div>
        <ArrowTopRightIcon />
      </Button>
    ),
    actions: [{ label: 'Rebuild', onSelect: () => {} }],
    isAlive: true,
  }, {
    name: 'GitLab',
    description: 'v2.11',
    icon: <GitLabLogoIcon />,
    primaryAction: (
      <Button
        secondary
        minHeight={32}
        height={32}
      >
        <div style={{ marginRight: '8px' }}>Launch</div>
        <ArrowTopRightIcon />
      </Button>
    ),
  }, {
    name: 'Airbyte',
    description: 'Very looooong looong looong application description. Very looooong looong looong application description.',
  },
  {
    name: 'Clickhouse',
    description: 'v1.24',
  },
]

const Container = styled(ContainerUnstyled)(({ theme }) => `
  display: flex;
  width: 700px;
  height: 600px;
  border: 1px solid ${theme.colors.border};
  background: ${theme.colors['fill-one']};
  border-radius: ${theme.borderRadiuses.large}px;
  padding: 24px;
`)

function ContainerUnstyled({ children, ...props }: any) {
  return <Card {...props}>{children}</Card>
}

function Template() {
  return (
    <Container>
      <AppList
        apps={APPS}
      />
    </Container>
  )
}

function ScrollableTemplate() {
  return (
    <Container height={400}>
      <AppList
        apps={APPS}
      />
    </Container>
  )
}

export const Default = Template.bind({})
export const Scrollable = ScrollableTemplate.bind({})
