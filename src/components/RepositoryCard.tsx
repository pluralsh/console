import { Div, DivProps, Flex, H2, H3, Img, P } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import Tag from './Tag'

type RepositoryCardProps = DivProps & {
  title?: string
  publisher?: string
  description?: string
  imageUrl?: string
  tags?: string[]
}

const propTypes = {
  title: PropTypes.string,
  publisher: PropTypes.string,
  description: PropTypes.string,
  imageUrl: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.string),
}

function RepositoryCardRef({
  title,
  publisher,
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
        <Div marginLeft="small">
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
        </Div>
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
