import {
  Button,
  CliIcon,
  CloseIcon,
  Input,
  PencilIcon,
} from '@pluralsh/design-system'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

export const CODELINE_HEIGHT = 42

const CodeInput = styled(Input)(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  flexShrink: 1,
  alignItems: 'center',
  minWidth: 0,
  input: {
    flexShrink: 0,
    width: 120,
    minWidth: 120,
  },
  'input, div': {
    ...theme.partials.text.code,
  },
  '& > div': {
    justifyContent: 'left',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    '&, *': {
      flexShrink: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      textAlign: 'left',
      justifyContent: 'right',
    },
  },
  '.prefix': {
    display: 'flex',
    '.firstHalf': {
      flexShrink: 1,
    },
    '.secondHalf': {
      flexShrink: 0,
    },
  },
}))

const CodeLine = styled(({ children, ...props }) => (
  <div {...props}>
    <div>{children}</div>
  </div>
))(({ theme }) => ({
  ...theme.partials.text.code,
  position: 'relative',
  overflowX: 'auto',
  overflowY: 'hidden',
  height: CODELINE_HEIGHT,
  whiteSpace: 'nowrap',
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-xlight'],
  backgroundColor: theme.colors['fill-one'],
  div: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    paddingLeft: theme.spacing.small,
    paddingRight: theme.spacing.small,
    top: 0,
    height: CODELINE_HEIGHT - theme.borderWidths.default * 2,
  },
}))

const CodeWrap = styled.div<{ $isEditing: boolean }>(({ $isEditing }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'stretch',
  overflowX: 'hidden',
  ...($isEditing ? { width: 0 } : { flexGrow: 1, flexShrink: 1 }),
}))

export function ShellCommandEditor({
  namespace,
  name,
  container,
  command,
  setCommand,
  isDefault,
  defaultCommand,
}: {
  namespace: string
  name: string
  container: string
  command: string
  setCommand: (arg: string | null) => void
  isDefault: boolean
  defaultCommand: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputVal, setInputVal] = useState(command)
  const inputWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setInputVal(command)
    }
  }, [command, isEditing])

  useEffect(() => {
    if (isEditing && inputWrapRef.current) {
      const input = inputWrapRef.current.querySelector('input')

      input?.focus()
    }
  }, [isEditing])

  const commandLeft = `kubectl exec ${name} -it -n ${namespace} -c ${container} -- `
  const commandSplit = commandLeft.split(' ')
  const commandLeft1 = commandSplit.slice(0, -4).join(' ')
  const commandLeft2 = commandSplit.slice(-4, -1).join(' ')

  return (
    <OuterFormSC
      onSubmit={(e) => {
        e.preventDefault()
        setCommand(inputVal)
        setIsEditing(false)
      }}
    >
      <WrapperSC ref={inputWrapRef}>
        <CodeWrap
          $isEditing={isEditing}
          className="codeWrap"
        >
          <CodeLine className="codeEdit">{`${commandLeft}${command}`}</CodeLine>
        </CodeWrap>
        {isEditing && (
          <CodeInput
            placeholder={defaultCommand}
            value={inputVal}
            prefix={
              <div className="prefix">
                <div className="firstHalf">{commandLeft1}</div>
                <div className="secondHalf">{commandLeft2}</div>
              </div>
            }
            onChange={({ target: { value } }) => {
              setInputVal(value)
            }}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.code.toLowerCase() === 'escape') {
                setIsEditing(false)
              }
            }}
          />
        )}
      </WrapperSC>
      {!isEditing && (
        <Button
          floating
          startIcon={<PencilIcon />}
          onClick={() => {
            setIsEditing(true)
          }}
        >
          Edit
        </Button>
      )}
      {isEditing && (
        <Button
          floating
          startIcon={<CliIcon />}
          type="submit"
        >
          Run
        </Button>
      )}
      {(isEditing || !isDefault) && (
        <Button
          secondary
          startIcon={<CloseIcon />}
          onClick={() => {
            setCommand(null)
            setIsEditing(false)
          }}
        >
          Reset
        </Button>
      )}
    </OuterFormSC>
  )
}

const WrapperSC = styled.div(() => ({
  display: 'flex',
  minWidth: 50,
  flex: '1 1',
  overflow: 'hidden',
}))

const OuterFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  width: '100%',
  flex: '1 1',
  overflow: 'hidden',
}))
