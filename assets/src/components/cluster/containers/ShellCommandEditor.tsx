import {
  Button,
  CliIcon,
  CloseIcon,
  Input,
  PencilIcon,
} from '@pluralsh/design-system'
import { useEffect, useRef, useState } from 'react'
import { Flex, Form } from 'honorable'
import { useParams } from 'react-router-dom'
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

const CodeWrap = styled.div<{ $isEditing: boolean; }>(({ $isEditing }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'stretch',
  overflowX: 'hidden',
  ...($isEditing ? { width: 0 } : { flexGrow: 1, flexShrink: 1 }),
}))

export function ShellCommandEditor({
  command, setCommand, isDefault, defaultCommand,
}: {
  command: string;
  setCommand: (arg: string | null) => void;
  isDefault: boolean;
  defaultCommand: string;
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputVal, setInputVal] = useState(command)
  const { namespace, name, container } = useParams()
  const inputWrapRef = useRef<HTMLDivElement>()

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
    <Form
      display="flex"
      gap="medium"
      onSubmit={e => {
        e.preventDefault()
        setCommand(inputVal)
        setIsEditing(false)
      }}
      width="100%"
      flex="1 1"
      overflow="hidden"
    >
      <Flex
        ref={inputWrapRef as any}
        minWidth={50}
        // width="50px"
        flex="1 1"
        overflow="hidden"
      >
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
            prefix={(
              <div className="prefix">
                <div className="firstHalf">{commandLeft1}</div>
                <div
                  className="secondHalf"
                >{commandLeft2}
                </div>
              </div>
            )}
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
      </Flex>
      {!isEditing && (
        <Button
          floating
          size="medium"
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
          size="medium"
          startIcon={<CliIcon />}
          type="submit"
        >
          Run
        </Button>
      )}
      {(isEditing || !isDefault) && (
        <Button
          secondary
          size="medium"
          startIcon={<CloseIcon />}
          onClick={() => {
            setCommand(null)
            setIsEditing(false)
          }}
        >
          Reset
        </Button>
      )}
    </Form>
  )
}
