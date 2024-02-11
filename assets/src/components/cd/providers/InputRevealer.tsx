// TODO: Move into design system
import { EyeClosedIcon, EyeIcon, IconFrame } from '@pluralsh/design-system'
import Input2 from '@pluralsh/design-system/dist/components/Input2'

import styled from 'styled-components'
import { ComponentProps, useState } from 'react'

const IconFrameStyled = styled(IconFrame)(({ theme }) => ({
  marginRight: -theme.spacing.medium + 3,
  color: theme.colors['icon-light'],
}))

export function InputRevealer({
  inputProps,
  defaultRevealed = false,
  ...props
}: { defaultRevealed?: boolean } & ComponentProps<typeof Input2>) {
  const [showInput, setShowInput] = useState(defaultRevealed)

  return (
    <Input2
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
