import { Div, DivProps, Flex, Img, P } from 'honorable'
import PropTypes from 'prop-types'

import InstalledLabel from './InstalledLabel'

type RepositoryCardProps = DivProps & {
  featured?: boolean
  installed?: boolean
  title?: string
  subtitle?: string
  imageUrl?: string
}

const propTypes = {
  featured: PropTypes.bool,
  installed: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  imageUrl: PropTypes.string,
}

function RepositoryCard({
  featured = false,
  installed = false,
  title,
  subtitle,
  imageUrl,
  children,
  ...props
}: RepositoryCardProps) {

  function renderContent() {
    return (
      <>
        <P
          body2
          color="text-xlight"
        >
          {subtitle}
        </P>
        <P
          body1
          mt={1}
          color="text-strong"
        >
          {children}
        </P>
      </>
    )
  }

  function renderFeatured() {
    return (
      <Flex
        p={1}
        justify="flex-start"
        align="flex-start"
        borderRadius={4}
        border="1px solid border"
        backgroundColor="background-middle"
        {...props}
      >
        <Img
          src={imageUrl}
          alt="Logo"
          width={128 - 32}
          borderRadius={4}
          objectFit="cover"
        />
        <Div
          ml={1}
          flexGrow={1}
        >
          <Flex
            align="center"
            justify="space-between"
          >
            <P
              body0
              fontWeight="bold"
            >
              {title}
            </P>
            {installed && (
              <InstalledLabel />
            )}
          </Flex>
          {renderContent()}
        </Div>
      </Flex>
    )
  }

  function renderRegular() {
    return (
      <Div
        p={1}
        borderRadius={4}
        border="1px solid border"
        backgroundColor="background-middle"
        {...props}
      >
        <Flex
          align="flex-start"
          justify="space-between"
        >
          <Img
            src={imageUrl}
            alt="Logo"
            width={64}
            borderRadius={4}
            objectFit="cover"
          />
          {installed && (
            <InstalledLabel />
          )}
        </Flex>
        <P
          mt={1}
          fontWeight="bold"
          body0
        >
          {title}
        </P>
        {renderContent()}
      </Div>
    )
  }

  return featured ? renderFeatured() : renderRegular()
}

RepositoryCard.propTypes = propTypes

export default RepositoryCard
