import { ReactNode, useMemo, useState } from 'react'
import { dump } from 'js-yaml'
import {
  Button,
  Code,
  EyeClosedIcon,
  EyeIcon,
  IconFrame,
  Modal,
} from '@pluralsh/design-system'

interface OutputValueProps {
  value: string
  secret: boolean
}

const MULTILINE_REGEX = /(.*[\n\r])+/

export default function OutputValue({
  value,
  secret,
}: OutputValueProps): ReactNode {
  const [hidden, setHidden] = useState(secret)
  const [object, setObject] = useState()
  const displayValue = useMemo(
    () =>
      hidden
        ? Array(value.length).fill('•', 0, Math.min(10, value.length)).join('')
        : value,
    [hidden, value]
  )
  const isObject = useMemo(() => {
    try {
      setObject(JSON.parse(value))

      return true
    } catch {
      return false
    }
  }, [value])

  const isMultiline = MULTILINE_REGEX.test(value)
  const useModal = isObject || isMultiline

  return (
    <div
      css={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
      }}
    >
      <div css={{ flexGrow: 1 }}>
        {useModal ? (
          <OutputValueModal
            value={object ?? value}
            isObject={isObject}
          />
        ) : (
          <span css={{ wordBreak: 'break-word' }}>{displayValue}</span>
        )}
      </div>
      {secret && !useModal && (
        <IconFrame
          size="medium"
          clickable
          tooltip={hidden ? 'Reveal value' : 'Hide value'}
          icon={hidden ? <EyeClosedIcon /> : <EyeIcon />}
          onClick={() => setHidden(() => !hidden)}
        />
      )}
    </div>
  )
}

interface OutputValueModalProps {
  value: any
  isObject?: boolean
}

function OutputValueModal({
  value,
  isObject,
}: OutputValueModalProps): ReactNode {
  const [open, setOpen] = useState(false)
  const tabs =
    value && isObject
      ? [
          {
            key: 'yaml',
            label: 'YAML',
            language: 'yaml',
            content: dump(value),
          },
          {
            key: 'json',
            label: 'JSON',
            language: 'json',
            content: JSON.stringify(value, null, 2),
          },
        ]
      : [
          {
            key: 'text',
            label: 'TEXT',
            content: value ?? 'Nothing to display here',
          },
        ]

  return (
    <>
      <Button
        secondary
        small
        onClick={() => setOpen(true)}
      >
        Show
      </Button>
      {open && (
        <Modal
          size="large"
          open
          onClose={() => setOpen(false)}
          scrollable={false}
          css={{
            '> div > div': {
              margin: 0,
            },
          }}
        >
          <Code
            tabs={tabs}
            css={{
              height: '100%',
            }}
          />
        </Modal>
      )}
    </>
  )
}
