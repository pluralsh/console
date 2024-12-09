import { Button, Code, Modal } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { stringify } from 'yaml'
import { ServiceTemplate } from '../../../../generated/graphql.ts'
import { deepOmitKey } from '../../../../utils/deepOmitKey.tsx'
import { ModalMountTransition } from '../../../utils/ModalMountTransition.tsx'

interface TemplateModalProps {
  serviceName: string
  template: ServiceTemplate
}

export function TemplateModal(
  props: ComponentProps<typeof TemplateModalInner>
) {
  return (
    <ModalMountTransition open={props.open}>
      <TemplateModalInner {...props} />
    </ModalMountTransition>
  )
}

function TemplateModalInner({
  open,
  onClose,
  template,
  serviceName,
  ...props
}: ComponentProps<typeof Modal> & TemplateModalProps) {
  return (
    <Modal
      form
      open={open}
      onClose={onClose}
      header={`${serviceName}'s service template`}
      actions={
        <Button
          secondary
          type="button"
          onClick={() => {
            onClose?.()
          }}
          css={{
            width: '100%',
          }}
        >
          Close
        </Button>
      }
      {...props}
    >
      <Code
        language="yaml"
        showHeader={false}
        css={{ height: '100%' }}
      >
        {stringify(deepOmitKey(template, '__typename' as const), null, 2)}
      </Code>
    </Modal>
  )
}
