import { ChipList, Code, Modal } from '@pluralsh/design-system'
import { ReactElement, useCallback, useState } from 'react'

import { dump } from 'js-yaml'

interface AnnotationsProps {
  annotations: object
}

const HIDDEN_ANNOTATIONS = ['last-applied-configuration']

export default function Annotations({
  annotations,
}: AnnotationsProps): ReactElement<any> {
  const isHiddenAnnotation = useCallback(
    (label: [string, string]) =>
      HIDDEN_ANNOTATIONS.some((annotation) => label[0].includes(annotation)),
    []
  )
  const [modal, setModal] = useState<ReactElement<any>>()
  const [open, setOpen] = useState(false)
  const createAnnotationModal = useCallback(
    (label: [string, string]): ReactElement<any> => {
      const [_, value] = label
      const object = JSON.parse(value)
      const tabs = value
        ? [
            {
              key: 'yaml',
              label: 'YAML',
              language: 'yaml',
              content: dump(object),
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
