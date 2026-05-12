import { ArrowScroll, Flex, SubTab } from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'
import { LinkTabWrap } from './Tabs'
import { ReactNode } from 'react'

export type SubtabDirectory = {
  path: string
  label: ReactNode
  enabled?: boolean
}[]

export function SubTabs({
  directory,
  activeFn,
  /** When set, tab links use this instead of `path` (for absolute URLs from nested routes). */
  resolveTo,
}: {
  directory: SubtabDirectory
  activeFn?: (path: string, route: string) => boolean
  resolveTo?: (path: string) => string
}) {
  const route = useParams()['*']
  return (
    <ArrowScroll>
      <Flex>
        {directory
          .filter(({ enabled }) => (enabled === undefined ? true : enabled))
          .map(({ path, label }) => (
            <LinkTabWrap
              active={
                activeFn?.(path, route ?? '') ??
                route?.split('/')?.includes(path.split('/').pop() ?? '')
              }
              key={path}
              to={resolveTo ? resolveTo(path) : path}
            >
              <SubTab css={{ minWidth: 'max-content' }}>{label}</SubTab>
            </LinkTabWrap>
          ))}
      </Flex>
    </ArrowScroll>
  )
}
