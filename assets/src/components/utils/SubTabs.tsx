import { Flex, SubTab } from '@pluralsh/design-system'
import { useParams } from 'react-router-dom'
import { LinkTabWrap } from './Tabs'
import { ReactNode } from 'react'

export type SubtabDirectory = {
  path: string
  label: ReactNode
  enabled?: boolean
}[]

export function SubTabs({ directory }: { directory: SubtabDirectory }) {
  const route = useParams()['*']
  return (
    <Flex>
      {directory
        .filter(({ enabled }) => (enabled === undefined ? true : enabled))
        .map(({ path, label }) => (
          <LinkTabWrap
            active={route?.split('/')?.includes(path.split('/').pop() ?? '')}
            key={path}
            to={path}
          >
            <SubTab css={{ minWidth: 'max-content' }}>{label}</SubTab>
          </LinkTabWrap>
        ))}
    </Flex>
  )
}
