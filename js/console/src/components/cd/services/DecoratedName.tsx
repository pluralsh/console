import { Flex, SpinnerAlt, Tooltip } from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { ReactNode } from 'react'

export default function DecoratedName({
  prefix,
  suffix,
  deletedAt,
  children,
}: {
  prefix?: ReactNode
  suffix?: ReactNode
  deletedAt?: Nullable<string>
  children: ReactNode
}) {
  return (
    <StretchedFlex gap="small">
      <Flex
        gap="xsmall"
        align="center"
      >
        {prefix}
        {children}
        {suffix}
      </Flex>
      {deletedAt && (
        <Tooltip
          label="Deleting"
          placement="top"
        >
          <SpinnerAlt color="icon-danger" />
        </Tooltip>
      )}
    </StretchedFlex>
  )
}
