import { Div, DivProps, Flex, H2, H3, Img, P } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import Chip from './Chip'

import PadlockLockedIcon from './icons/PadlockLockedIcon'
import StatusOkIcon from './icons/StatusOkIcon'

import Tag from './Tag'

type RepositoryCardProps = DivProps & {
  title?: string
  publisher?: string
  priv?: boolean
  installed?: boolean
  description?: string
  imageUrl?: string
  tags?: string[]
}

const propTypes = {
  title: PropTypes.string,
  publisher: PropTypes.string,
  priv: PropTypes.bool,
  installed: PropTypes.bool,
  description: PropTypes.string,
  imageUrl: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
}

function RepositoryCardRef({
  title,
  publisher,
  priv,
  installed,
  description,
  imageUrl,
  tags = [],
  ...props
}: RepositoryCardProps,
ref: Ref<any>
) {
  return (
    <Flex
      ref={ref}
      direction="column"
      padding="medium"
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
        <Img
          src={imageUrl}
          alt="Logo"
          width={56}
          height={56}
          borderRadius="medium"
          objectFit="cover"
        />
        <Flex
          direction="column"
          marginLeft="small"
          width="100%"
        >
          <Flex width="100%">
            <H2
              subtitle2
              color="text"
              height={26}
            >
              {title}
            </H2>
            <Flex width="100%" />
            {!!installed && (
              <Chip
                marginHorizontal="xxsmall"
                severity="success"
                icon={<StatusOkIcon />}
              >
                <Div fontWeight={600}>Installed</Div>
              </Chip>
            )}
            {!!priv && (
              <PadlockLockedIcon marginHorizontal="xxsmall" />
            )}
          </Flex>
          <H3
            body2
            color="text-xlight"
          >
            {publisher}
          </H3>
        </Flex>
      </Flex>
      {description && (
        <P
          body2
          marginTop="xsmall"
          color="text-light"
        >
          {description}
        </P>
      )}
      <Div flexGrow={1} />
      {tags && tags.length > 0 && (
        <Flex
          marginTop="xsmall"
          gap="xsmall"
          flexWrap="wrap"
        >
          {tags.map(tag => (
            <Tag
              key={tag}
              _last={{ marginRight: 0 }}
              backgroundColor="fill-two"
            >
              {tag}
            </Tag>
          ))}
        </Flex>
      )}
    </Flex>
  )
}

const RepositoryCard = forwardRef(RepositoryCardRef)

RepositoryCard.propTypes = propTypes

export default RepositoryCard
