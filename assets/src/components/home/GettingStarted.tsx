import { Button, Card, ConfettiIcon, Flex } from '@pluralsh/design-system'
import { Body1BoldP, Body2P } from '../utils/typography/Text.tsx'
import { useTheme } from 'styled-components'

export function GettingStarted() {
  const theme = useTheme()

  return (
    <div
      css={{
        backdropFilter: 'blur(4px)',
        inset: 0,
        position: 'absolute',
        zIndex: theme.zIndexes.modal,
      }}
    >
      <Card
        css={{
          alignItems: 'center',
          backgroundColor: theme.colors['fill-one'],
          border: theme.borders.input,
          boxShadow: theme.boxShadows.modal,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          left: '50%',
          padding: theme.spacing.xxlarge,
          position: 'absolute',
          top: 88,
          transform: 'translateX(-50%)',
          width: 576,
        }}
      >
        <ConfettiIcon
          size={64}
          color={'icon-primary'}
        />
        <Body1BoldP>Congrats on deploying your Plural Console!</Body1BoldP>
        <Body2P
          css={{ color: theme.colors['text-light'], textAlign: 'center' }}
        >
          To get the most out of the Continuous Deployment (CD) experience, you
          can begin to add more clusters. Check out the docs or contact us to
          learn more.
        </Body2P>
        <Flex
          gap="xsmall"
          marginTop={theme.spacing.xsmall}
        >
          <Button secondary>Dismiss</Button>
          <Button
            floating
            as="a"
            href="https://www.plural.sh/contact"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact the team
          </Button>
          <Button
            as="a"
            href="https://docs.plural.sh/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read docs
          </Button>
        </Flex>
      </Card>
    </div>
  )
}
