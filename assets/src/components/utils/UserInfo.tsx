import { Box } from 'grommet'
import { Span } from 'honorable'
import { AppIcon } from '@pluralsh/design-system'

export default function UserInfo({
  user: { email, name, avatar },
  hue = 'lighter',
  ...box
}: any) {
  return (
    <Box
      {...box}
      direction="row"
      gap="small"
      align="center"
    >
      <AppIcon
        url={avatar}
        name={name}
        spacing={avatar ? 'none' : undefined}
        size="xsmall"
        hue={hue}
      />
      <Box>
        <Span fontWeight="bold">{name}</Span>
        <Span color="text-light">{email}</Span>
      </Box>
    </Box>
  )
}
