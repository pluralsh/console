import React, { ReactNode, useMemo, useState } from 'react'
import yaml from 'js-yaml'
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

  return (
    <div
      css={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
      }}
    >
      <div css={{ flexGrow: 1 }}>
        {isObject ? (
          <OutputValueModal object={object} />
        ) : (
          <span css={{ wordBreak: 'break-word' }}>{displayValue}</span>
        )}
      </div>
      {secret && !isObject && (
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
  object: any
}

function OutputValueModal({ object }: OutputValueModalProps): ReactNode {
  const [open, setOpen] = useState(false)
  const tabs = object
    ? [
        {
          key: 'yaml',
          label: 'YAML',
          language: 'yaml',
          content: yaml.dump(object),
        },
        {
          key: 'json',
          label: 'JSON',
          language: 'json',
          content: JSON.stringify(object, null, 2),
        },
      ]
    : []

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
