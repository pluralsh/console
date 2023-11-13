import {
  Button,
  Card,
  DiscordIcon,
  LifePreserverIcon,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import {
  Body2BoldP,
  Body2P,
  OverlineH1,
} from 'components/utils/typography/Text'
import {
  DISCORD_LINK,
  DOCS_CD_QUICKSTART_LINK,
  DOCS_CLI_QUICKSTART_LINK,
  DOCS_INBROWSER_QUICKSTART_LINK,
} from 'utils/constants'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { useIntercom } from 'react-use-intercom'

import { EmbedAspectRatio } from '../../utils/layout/EmbedAspectRatio'

const GettingStartedOl = styled.ol(({ theme }) => ({
  ...theme.partials.reset.list,
  counterReset: 'list-number',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const GettingStartedUl = styled.ul(({ theme }) => ({
  ...theme.partials.reset.list,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
}))

const GettingStartedOlLi = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  ...theme.partials.text.body2Bold,
  counterIncrement: 'list-number',
  position: 'relative',
  marginLeft: theme.spacing.large,
  '&::before': {
    content: 'counter(list-number)"."',
    position: 'absolute',
    marginLeft: -theme.spacing.large,
    top: 0,
    left: 0,
  },
}))

const GettingStartedUlLi = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  ...theme.partials.text.body2,
  position: 'relative',
  marginLeft: theme.spacing.large,
  '&::before': {
    content: '"•"',
    position: 'absolute',
    marginLeft: -theme.spacing.large,
    top: 0,
    left: 0,
  },
}))

const GettingStartedCardSC = styled(Card)(({ theme }) => ({
  '&&': { padding: theme.spacing.large },
  h3: {
    ...theme.partials.text.overline,
  },
}))

const VideoCardSC = styled(Card)((_) => ({
  overflow: 'hidden',
}))

export function ClustersGettingStarted() {
  const theme = useTheme()
  const intercom = useIntercom()

  return (
    <div
      css={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: theme.spacing.medium,
        marginTop: theme.spacing.large,
      }}
    >
      <GettingStartedCardSC>
        <OverlineH1
          as="h3"
          css={{
            color: theme.colors['text-xlight'],
            marginBottom: theme.spacing.large,
          }}
        >
          Get started in 3 easy steps
        </OverlineH1>
        <div css={{ maxWidth: 420 }}>
          <GettingStartedOl>
            <GettingStartedOlLi>Create your cluster</GettingStartedOlLi>
            <GettingStartedOlLi>Import your repository</GettingStartedOlLi>
            <GettingStartedOlLi as="li">
              Deploy to your cluster of choice
            </GettingStartedOlLi>
          </GettingStartedOl>
          <Body2P
            css={{
              marginTop: theme.spacing.medium,
              color: theme.colors['text-light'],
            }}
          >
            Optionally spin up additional workload clusters or import additional
            cloud providers.
          </Body2P>
          <Button
            onClick={() => {
              window.open(DOCS_CD_QUICKSTART_LINK, '_blank')
            }}
            css={{ marginTop: theme.spacing.large }}
            secondary
          >
            View deployments guide
          </Button>
        </div>
      </GettingStartedCardSC>
      <VideoCardSC>
        <EmbedAspectRatio $aspectRatio={1920 / 1080}>
          <iframe
            src="https://www.youtube-nocookie.com/embed/jBlq45ntbBw?si=2pjQiyHCwdrxZUak"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </EmbedAspectRatio>
      </VideoCardSC>
      <GettingStartedCardSC css={{ gridColumn: '1 / -1' }}>
        <OverlineH1
          as="h3"
          css={{
            color: theme.colors['text-xlight'],
            marginBottom: theme.spacing.large,
          }}
        >
          Helpful resources
        </OverlineH1>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xxlarge,
          }}
        >
          <div css={{ maxWidth: 420 }}>
            <Body2BoldP
              as="h4"
              css={{ marginBottom: theme.spacing.small }}
            >
              Docs
            </Body2BoldP>
            <GettingStartedUl>
              <GettingStartedUlLi>
                <InlineLink
                  target="_blank"
                  href={DOCS_CLI_QUICKSTART_LINK}
                >
                  CLI Quickstart Guide
                </InlineLink>
              </GettingStartedUlLi>
              <GettingStartedUlLi>
                <InlineLink
                  target="_blank"
                  href={DOCS_INBROWSER_QUICKSTART_LINK}
                >
                  In-Browser Quickstart
                </InlineLink>
              </GettingStartedUlLi>
            </GettingStartedUl>
          </div>
          <div css={{}}>
            <Body2BoldP
              as="h4"
              css={{ marginBottom: theme.spacing.small }}
            >
              Docs
            </Body2BoldP>
            <Button
              onClick={() => {
                window.open(DISCORD_LINK, '_blank')
              }}
              secondary
              startIcon={<DiscordIcon />}
            >
              Join the community
            </Button>
          </div>
          <div css={{}}>
            <Body2BoldP
              as="h4"
              css={{ marginBottom: theme.spacing.small }}
            >
              Docs
            </Body2BoldP>
            <Button
              onClick={() => {
                intercom?.show()
              }}
              secondary
              startIcon={<LifePreserverIcon />}
            >
              Ask us on Intercom
            </Button>
          </div>
        </div>
      </GettingStartedCardSC>
    </div>
  )
}
