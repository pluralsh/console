import { Box, Text } from 'grommet'
import { Close } from 'grommet-icons'

export function ModalHeader({ text, setOpen }) {
  return (
    <Box
      flex={false}
      direction="row"
      pad={{ horizontal: 'small', top: 'small' }}
    >
      <Box
        direction="row"
        fill="horizontal"
        align="center"
      >
        <Text
          size="16px"
          weight={500}
        >{text}
        </Text>
      </Box>
      <Box
        flex={false}
        hoverIndicator="light-3"
        focusIndicator={false}
        pad="xsmall"
        round="xsmall"
        align="center"
        justify="center"
        onClick={() => setOpen(false)}
      >
        <Close size="16px" />
      </Box>
    </Box>
  )
}

export function ModalContent({ pad, children, ...props }) {
  return (
    <Box
      pad={pad || { bottom: 'small' }}
      {...props}
    >
      {children}
    </Box>
  )
}
