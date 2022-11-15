import {
  Div,
  DivProps,
  Flex,
  H1,
  H3,
  Img,
  P,
  Span,
} from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import Chip from './Chip'
import PadlockLockedIcon from './icons/PadlockLockedIcon'
import VerifiedIcon from './icons/VerifiedIcon'
import Card from './Card'
import RocketIcon from './icons/RocketIcon'

type RepositoryCardProps = DivProps & {
  title?: string
  publisher?: string
  priv?: boolean
  installed?: boolean
  verified?: boolean
  trending?: boolean
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
  trending: PropTypes.bool,
  description: PropTypes.string,
  imageUrl: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
}

function RepositoryCardRef({
  title,
  publisher,
  priv,
  installed,
  verified,
  trending,
  description,
  imageUrl,
  tags = [],
  size = 'small',
  ...props
}: RepositoryCardProps,
ref: Ref<any>) {
  const maxTags = trending ? 5 : 6

  return (
    <Card
      ref={ref}
      clickable
      flexDirection="column"
      padding="large"
      width="100%"
      {...props}
    >
      <Flex
        height="100%"
        align="flex-start"
      >
        <Img
          src={imageUrl}
          width={size === 'medium' ? 140 : 160}
          height={size === 'medium' ? 140 : 160}
          display={size === 'small' ? 'none' : 'block'}
          padding="xlarge"
          backgroundColor="fill-two"
          borderRadius="medium"
          border="1px solid border-fill-two"
          marginRight="large"
        />
        <Flex
          flexGrow={1}
          direction="column"
          height="100%"
        >
          <Flex align="center">
            <Img
              src={imageUrl}
              width={64}
              height={64}
              padding="xsmall"
              display={size === 'small' ? 'block' : 'none'}
              backgroundColor="fill-two"
              borderRadius="medium"
              border="1px solid border-fill-two"
            />
            <Flex
              direction="row"
              marginLeft={size === 'small' ? 'small' : 0}
              width="100%"
              align="flex-start"
              justify="space-between"
            >
              <Flex direction="column">
                <H1
                  color="text"
                  title2={size !== 'large'}
                  title1={size === 'large'}
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
                  marginBottom={size === 'large' ? 'small' : 0}
                >
                  {publisher}
                </H3>
              </Flex>
              <Flex
                justifyContent="end"
                flexGrow={1}
                marginLeft="medium"
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
                    backgroundColor="transparent"
                    border="none"
                  >
                    <PadlockLockedIcon />
                  </Chip>
                )}
              </Flex>
            </Flex>
          </Flex>
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
          {(trending || tags?.length > 0) && (
            <Flex
              marginTop="medium"
              gap="xsmall"
              flexWrap="wrap"
            >
              {!!trending && (
                <Chip
                  size="small"
                  hue="lighter"
                >
                  <RocketIcon color="action-link-inline" />
                  <Span
                    color="action-link-inline"
                    marginLeft="xxsmall"
                  >
                    Trending
                  </Span>
                </Chip>
              )}
              {tags?.filter((_x, i) => i < maxTags).map(tag => (
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
        </Flex>
      </Flex>
    </Card>
  )
}

const RepositoryCard = forwardRef(RepositoryCardRef)

RepositoryCard.propTypes = propTypes

export default RepositoryCard
