import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import { EditableDiv } from '../../../../../utils/EditableDiv.tsx'

interface SSHProps {
  data: { key: string; value: string }[]
  setData: Dispatch<SetStateAction<{ key: string; value: string }[]>>
  setValid: Dispatch<SetStateAction<boolean>>
}

function SSH({ setData, setValid }: SSHProps): ReactNode {
  const theme = useTheme()
  const [value, setValue] = useState('')

  useEffect(() => {
    setValid(!!value)
  }, [setValid, value])

  return (
    <EditableDiv
      placeholder="private-key"
      initialValue={value}
      setValue={(v) => {
        setValue(v)
        setData([{ key: 'ssh-privatekey', value: v }])
      }}
      css={{
        padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
        border: theme.borders.input,
        borderRadius: theme.borderRadiuses.medium,
        backgroundColor: theme.colors['fill-two'],
        '&:focus': {
          border: theme.borders['outline-focused'],
          backgroundColor: theme.colors['fill-two'],
        },
        maxHeight: '176px',
      }}
    />
  )
}

export { SSH }
