import { Div, DivProps, Img, P } from 'honorable'
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
          color="text-xweak"
        >
          {subtitle}
        </P>
        <P
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
      <Div
        p={1}
        borderRadius={4}
        backgroundColor="background-middle"
        xflex="x1"
        {...props}
      >
        <Img
          src={imageUrl}
          alt="Logo"
          width={128}
          borderRadius={4}
          objectFit="cover"
          backgroundColor="background-light"
        />
        <Div ml={1}>
          <Div xflex="x5b">
            <P
              body0
              fontWeight="bold"
            >
              {title}
            </P>
            {installed && (
              <InstalledLabel />
            )}
          </Div>
          {renderContent()}
        </Div>
      </Div>
    )
  }

  function renderRegular() {
    return (
      <Div
        p={1}
        borderRadius={4}
        backgroundColor="background-middle"
        {...props}
      >
        <Div xflex="x5b">
          <Img
            src={imageUrl}
            alt="Logo"
            width={64}
            borderRadius={4}
            objectFit="cover"
            backgroundColor="background-light"
          />
          {installed && (
            <InstalledLabel />
          )}
        </Div>
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
