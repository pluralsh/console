import { type Ref, forwardRef } from 'react'
import { useTheme } from 'styled-components'

import { PrQueueIcon } from '../icons'

import Chip from './Chip'
import Card, { type CardProps } from './Card'
import AppIcon from './AppIcon'
import ChipList from './ChipList'
import Flex from './Flex'

type CatalogCardProps = CardProps & {
  name?: string
  author?: string
  category?: string
  description?: string
  imageUrl?: string
  tags?: string[]
}

function CatalogCardRef(
  {
    name,
    author,
    category,
    description,
    imageUrl,
    tags = [],
    ...props
  }: CatalogCardProps,
  ref: Ref<any>
) {
  const theme = useTheme()

  return (
    <Card
      ref={ref}
      clickable
      style={{
        flexDirection: 'column',
        padding: theme.spacing.medium,
        maxWidth: 456,
        minWidth: 256,
        width: '100%',
      }}
      {...props}
    >
      <Flex
        height="100%"
        align="flex-start"
        gap="large"
      >
        <Flex
          flexGrow={1}
          direction="column"
          height="100%"
          overflow="hidden"
        >
          <Flex align="center">
            <AppIcon
              size="xxsmall"
              url={imageUrl}
              icon={<PrQueueIcon />}
            />
            <Flex
              direction="row"
              marginLeft={theme.spacing.small}
              width="100%"
              align="flex-start"
              justify="space-between"
            >
              <Flex direction="column">
                <div
                  style={{
                    ...theme.partials.text.body2Bold,
                    color: theme.colors.text,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    ...theme.partials.text.caption,
                    color: theme.colors['text-xlight'],
                  }}
                >
                  by {author}
                </div>
              </Flex>
            </Flex>
          </Flex>
          {description && (
            <p
              style={{
                ...theme.partials.text.body2,
                margin: 0,
                marginTop: theme.spacing.small,
                color: theme.colors['text-light'],
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </p>
          )}
          <div style={{ flexGrow: 1 }} />
          {(category || tags?.length > 0) && (
            <Flex
              alignItems="start"
              gap="large"
              justifyContent={category ? 'space-between' : 'end'}
              marginTop={theme.spacing.medium}
            >
              {!!category && (
                <Chip
                  size="small"
                  border="none"
                  fillLevel={3}
                >
                  {category}
                </Chip>
              )}
              <ChipList
                size="small"
                border="none"
                fillLevel={3}
                values={tags ?? []}
                limit={1}
                truncateWidth={100}
                wrap="nowrap"
                emptyState={null}
              />
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}

const CatalogCard = forwardRef(CatalogCardRef)

export default CatalogCard
