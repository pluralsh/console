import { Flex, IconFrame } from '@pluralsh/design-system'
import { ReactElement, ReactNode } from 'react'
import { StackedText } from 'components/utils/table/StackedText'

export function WorkbenchTabHeader({
  title,
  description,
  icon,
}: {
  title: ReactNode
  description?: ReactNode
  icon?: ReactElement
}) {
  return (
    <StackedText
      first={
        icon ? (
          <Flex
            align="center"
            gap="xsmall"
          >
            <IconFrame
              size="small"
              icon={icon}
            />
            {title}
          </Flex>
        ) : (
          title
        )
      }
      second={description}
      firstPartialType="subtitle1"
      firstColor="text"
      secondPartialType="body1"
      secondColor="text-xlight"
      gap={description ? 'xsmall' : undefined}
    />
  )
}
