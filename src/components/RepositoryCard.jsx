import { Box, Text } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

import CheckOutlineIcon from './icons/CheckOutlineIcon'

const Container = styled(Box)`
  padding: 16px;
  border-radius: 4px;
  background-color: ${({ theme }) => normalizeColor(theme.global.colors['background-contrast'], theme)};
`

const Logo = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 4px;
  object-fit: cover;
  background-color: ${({ theme }) => normalizeColor(theme.global.colors['background-light'], theme)}
`

const LogoLarge = styled.img`
  width: 128px;
  height: 128px;
  border-radius: 4px;
  object-fit: cover;
  background-color: ${({ theme }) => normalizeColor(theme.global.colors['background-light'], theme)}
`

export default function RepositoryCard({
  featured = false,
  installed = false,
  title = '',
  subtitle = '',
  imageUrl = '',
  children,
  ...props
}) {

  function renderInstalled() {
    return installed && (
      <Box
        direction="row"
        align="center"
      >
        <Text weight="bold">
          Installed
        </Text>
        <CheckOutlineIcon
          color="status-ok"
          style={{ marginLeft: '6px' }}
        />
      </Box>
    )
  }
  function renderFeatured() {
    return (
      <Container
        direction="row"
        align="start"
        {...props}
      >
        <LogoLarge
          src={imageUrl}
          alt="Logo"
        />
        <Box margin={{ left: '16px' }}>
          <Box
            direction="row"
            align="center"
            justify="between"
          >
            <Text
              weight="bold"
              size="large"
            >
              {title}
            </Text>
            {renderInstalled()}
          </Box>
          <Text color="text-xweak">
            {subtitle}
          </Text>
          <Text
            color="text-strong"
            margin={{ top: '16px' }}
          >
            {children}
          </Text>
        </Box>
      </Container>
    )
  }

  function renderRegular() {
    return (
      <Container {...props}>
        <Box
          direction="row"
          align="center"
          justify="between"
        >
          <Logo
            src={imageUrl}
            alt="Logo"
          />
          {renderInstalled()}
        </Box>
        <Text
          weight="bold"
          size="large"
          margin={{ top: '16px' }}
        >
          {title}
        </Text>
        <Text color="text-xweak">
          {subtitle}
        </Text>
        <Text
          color="text-strong"
          margin={{ top: '16px' }}
        >
          {children}
        </Text>
      </Container>
    )
  }

  return featured ? renderFeatured() : renderRegular()
}
