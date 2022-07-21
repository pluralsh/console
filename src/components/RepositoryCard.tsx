import { Div, DivProps, Flex, H2, H3, P, Span } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import RepositoryIcon from '../../src/components/RepositoryIcon'

import Chip from './Chip'

import PadlockLockedIcon from './icons/PadlockLockedIcon'
import StatusOkIcon from './icons/StatusOkIcon'

type RepositoryCardProps = DivProps & {
  title?: string
  publisher?: string
  priv?: boolean
  installed?: boolean
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
  description,
  imageUrl,
  tags = [],
  size = 'medium',
  ...props
}: RepositoryCardProps,
ref: Ref<any>
) {
  return (
    <Flex
      ref={ref}
      direction="column"
      padding="large"
      paddingTop="medium"
      borderRadius="large"
      border="1px solid border"
      backgroundColor="fill-one"
      cursor="pointer"
      _hover={{
        backgroundColor: 'fill-one-hover',
      }}
      {...props}
    >
      <Flex align="center">
        <RepositoryIcon
          size="small"
          url={imageUrl}
        />
        <Flex
          direction="row"
          marginLeft="small"
          width="100%"
        >
          <Flex direction="column">
            <H2
              subtitle2
              color="text"
            >
              {title}
            </H2>
            <H3
              body2
              color="text-xlight"
            >
              {publisher}
            </H3>
          </Flex>
          <Flex
            justifyContent="end"
            flexGrow={1}
          >
            {!!installed && (
              <Chip
                severity="success"
                icon={<StatusOkIcon />}
                height={26}
                marginHorizontal="xxsmall"
                backgroundColor="fill-two"
                borderColor="border-fill-two"
              >
                <Span fontWeight={600}>Installed</Span>
              </Chip>
            )}
            {!!priv && (
              <PadlockLockedIcon
                height={26}
                marginHorizontal="xxsmall"
              />
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
      {tags && tags.length > 0 && (
        <Flex
          marginTop="medium"
          gap="xsmall"
          flexWrap="wrap"
        >
          {tags.map(tag => (
            <Chip
              size="small"
              key={tag}
              _last={{ marginRight: 0 }}
              backgroundColor="fill-two"
            >
              {tag}
            </Chip>
          ))}
        </Flex>
      )}
    </Flex>
  )
}

const RepositoryCard = forwardRef(RepositoryCardRef)

RepositoryCard.propTypes = propTypes

export default RepositoryCard
