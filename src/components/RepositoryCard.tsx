import {
  Div, DivProps, Flex, H1, H3, P, Span,
} from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import Chip from './Chip'
import PadlockLockedIcon from './icons/PadlockLockedIcon'
import VerifiedIcon from './icons/VerifiedIcon'
import IconFrame from './IconFrame'
import Card from './Card'

type RepositoryCardProps = DivProps & {
  title?: string
  publisher?: string
  priv?: boolean
  installed?: boolean
  verified?: boolean
  description?: string
  imageUrl?: string
  tags?: string[],
  size?: 'small' | 'medium' | 'large' | string
}

const propTypes = {
  title: PropTypes.string,
  publisher: PropTypes.string,
  priv: PropTypes.bool,
  installed: PropTypes.bool,
  verified: PropTypes.bool,
  description: PropTypes.string,
  imageUrl: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
}

const sizeToWidth: { [key in 'small' | 'medium' | 'large']: number } = {
  small: 697,
  medium: 777,
  large: 801,
}

function RepositoryCardRef({
  title,
  publisher,
  priv,
  installed,
  verified,
  description,
  imageUrl,
  tags = [],
  size = 'small',
  ...props
}: RepositoryCardProps,
ref: Ref<any>) {
  return (
    <Card
      ref={ref}
      clickable
      flexDirection="column"
      padding="large"
      width={sizeToWidth[size]}
      maxWidth={sizeToWidth[size]}
      {...props}
    >
      <Flex align="center">
        <IconFrame
          size={size}
          url={imageUrl}
        />
        <Flex
          direction="row"
          marginLeft="small"
          width="100%"
        >
          <Flex direction="column">
            <H1
              color="text"
              title1={size === 'large'}
              title2={size !== 'large'}
            >
              {title}
              {!!verified && (
                <VerifiedIcon
                  color="action-link-inline"
                  size={12}
                  position="relative"
                  bottom={10}
                  left={4}
                />
              )}
            </H1>
            <H3
              body2
              color="text-xlight"
            >
              {publisher}
            </H3>

            {size !== 'small' && (
              <>
                {description && (
                  <P
                    body2
                    marginTop="xsmall"
                    color="text-light"
                    style={{
                      display: '-webkit-box',
                      '-webkit-line-clamp': '2',
                      '-webkit-box-orient': 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {description}
                  </P>
                )}
                <Div flexGrow={1} />
                {tags && tags.length > 0 && (
                  <Flex
                    marginTop="medium"
                    gap="xsmall"
                    flexWrap="wrap"
                  >
                    {tags.map(tag => (
                      <Chip
                        size="small"
                        hue="lighter"
                        key={tag}
                        _last={{ marginRight: 0 }}
                      >
                        {tag}
                      </Chip>
                    ))}
                  </Flex>
                )}
              </>
            )}
          </Flex>
          <Flex
            justifyContent="end"
            flexGrow={1}
          >
            {!!installed && (
              <Chip
                severity="success"
                size="large"
                hue="lighter"
              >
                <Span fontWeight={600}>Installed</Span>
              </Chip>
            )}
            {!!priv && (
              <Chip
                size="large"
                hue="lighter"
                marginLeft={8}
                paddingHorizontal={8}
                paddingVertical={8}
              >
                <PadlockLockedIcon />
              </Chip>
            )}
          </Flex>
        </Flex>
      </Flex>
      {size === 'small' && (
        <>
          {description && (
            <P
              body2
              marginTop="xsmall"
              color="text-light"
              style={{
                display: '-webkit-box',
                '-webkit-line-clamp': '2',
                '-webkit-box-orient': 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </P>
          )}
          <Div flexGrow={1} />
          {tags && tags.length > 0 && (
            <Flex
              marginTop="medium"
              gap="xsmall"
              flexWrap="wrap"
            >
              {tags.map(tag => (
                <Chip
                  size="small"
                  hue="lighter"
                  key={tag}
                  _last={{ marginRight: 0 }}
                >
                  {tag}
                </Chip>
              ))}
            </Flex>
          )}
        </>
      )}
    </Card>
  )
}

const RepositoryCard = forwardRef(RepositoryCardRef)

RepositoryCard.propTypes = propTypes

export default RepositoryCard
