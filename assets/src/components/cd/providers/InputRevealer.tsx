// TODO: Move into design system
import {
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  Input,
} from '@pluralsh/design-system'
import styled from 'styled-components'
import { ComponentProps, useState } from 'react'

const IconFrameStyled = styled(IconFrame)(({ theme }) => ({
  marginRight: -theme.spacing.medium + 3,
  color: theme.colors['icon-light'],
}))

export function InputRevealer({
  inputProps,
  ...props
}: ComponentProps<typeof Input>) {
  const [showInput, setShowInput] = useState(false)

  return (
    <Input
      inputProps={{
        ...inputProps,
        type: showInput ? 'text' : 'password',
      }}
      endIcon={
        <IconFrameStyled
          size="medium"
          tooltip={showInput ? 'Hide' : 'Reveal'}
          clickable
          icon={showInput ? <EyeIcon /> : <EyeClosedIcon />}
          onClick={() => setShowInput((last) => !last)}
        />
      }
      {...props}
    />
  )
}
