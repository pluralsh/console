import { ReactElement, useCallback, useState } from 'react'
import { ChipList, Code, Modal } from '@pluralsh/design-system'

import yaml from 'js-yaml'

interface AnnotationsProps {
  annotations: object
}

const HIDDEN_ANNOTATIONS = ['last-applied-configuration']

export default function Annotations({
  annotations,
}: AnnotationsProps): ReactElement {
  const isHiddenAnnotation = useCallback(
    (label: [string, string]) =>
      HIDDEN_ANNOTATIONS.some((annotation) => label[0].includes(annotation)),
    []
  )
  const [modal, setModal] = useState<ReactElement>()
  const [open, setOpen] = useState(false)
  const createAnnotationModal = useCallback(
    (label: [string, string]): ReactElement => {
      const [_, value] = label
      const object = JSON.parse(value)
      const tabs = value
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

      setOpen(true)

      return (
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
      )
    },
    []
  )

  return (
    <>
      <ChipList<[string, string]>
        size="small"
        limit={3}
        values={Object.entries(annotations || {})}
        transformValue={(label) =>
          isHiddenAnnotation(label) ? label[0] : label.join(': ')
        }
        onClickCondition={isHiddenAnnotation}
        onClick={(label: [string, string]) =>
          setModal(createAnnotationModal(label))
        }
        emptyState={<div>-</div>}
      />
      {open && modal}
    </>
  )
}
