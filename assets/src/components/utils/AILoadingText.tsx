import { Flex, FlexProps, LoaderIcon } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'

export function AILoadingText({
  whimsey,
  ...props
}: FlexProps & { whimsey?: Nullable<string> }) {
  return (
    <Flex
      alignItems="center"
      gap="xsmall"
      {...props}
    >
      <LoaderIcon
        color="icon-xlight"
        css={{
          animation: 'workbench-loader-pulse 1.2s ease-in-out infinite',
          '@keyframes workbench-loader-pulse': {
            '0%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
            '50%': { opacity: 0.5, transform: 'scale(1.18) rotate(90deg)' },
            '100%': { opacity: 1, transform: 'scale(1) rotate(180deg)' },
          },
        }}
      />
      <Body2P
        $shimmer
        css={{ width: 'fit-content' }}
      >
        {whimsey || 'Planning next moves'}
      </Body2P>
    </Flex>
  )
}
