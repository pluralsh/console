import { FormField } from '@pluralsh/design-system'
import Input2 from '@pluralsh/design-system/dist/components/Input2'
import { useTheme } from 'styled-components'

import { GqlError } from 'components/utils/Alert'

import { ApolloError } from '@apollo/client'

type ScmWebhookVars = {
  owner: string
}

// function EditScmWebhookModalBase({
//   open,
//   onClose,
//   scmWebhook,
// }: {
//   open: boolean
//   onClose: Nullable<() => void>
//   scmWebhook: ScmWebhookFragment
// }) {
//   const theme = useTheme()
//   const {
//     state: formState,
//     update: updateFormState,
//     hasUpdates,
//   } = useUpdateState<Partial<ScmWebhookVars>>(pick(scmWebhook, ['owner']))

//   const [mutation, { loading, error }] = useUpdateScmWebhookMutation({
//     onCompleted: () => {
//       onClose?.()
//     },
//   })
//   const { name, type } = formState
//   const allowSubmit = name && type && hasUpdates
//   const onSubmit = useCallback(
//     (e) => {
//       e.preventDefault()

//       if (allowSubmit) {
//         const attributes = {
//           name,
//           type,
//           apiUrl: formState.apiUrl || '',
//           baseUrl: formState.baseUrl || '',
//           username: formState.username || '',
//           ...(!formState.token ? {} : { token: formState.token }),
//           ...(!formState.signingPrivateKey
//             ? {}
//             : { signingPrivateKey: formState.signingPrivateKey }),
//         }

//         mutation({ variables: { id: scmWebhook.id, attributes } })
//       }
//     },
//     [allowSubmit, formState, mutation, name, scmWebhook.id, type]
//   )

//   return (
//     <Modal
//       portal
//       open={open}
//       onClose={onClose || undefined}
//       asForm
//       onSubmit={onSubmit}
//       header={`Update connection - ${scmWebhook.name}`}
//       actions={
//         <div
//           css={{
//             display: 'flex',
//             flexDirection: 'row-reverse',
//             gap: theme.spacing.small,
//           }}
//         >
//           <Button
//             loading={loading}
//             primary
//             disabled={!allowSubmit}
//             type="submit"
//           >
//             Update
//           </Button>
//           <Button
//             secondary
//             onClick={() => onClose?.()}
//           >
//             Cancel
//           </Button>
//         </div>
//       }
//     >
//       <ScmWebhookForm
//         {...{ type: 'update', formState, updateFormState, error }}
//       />
//     </Modal>
//   )
// }

export function ScmWebhookForm({
  type: _type,
  formState,
  updateFormState,
  error,
}: {
  type: 'update' | 'create'
  formState: Partial<ScmWebhookVars>
  updateFormState: (update: Partial<ScmWebhookVars>) => void
  error: ApolloError | undefined
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <FormField
        label="Owner"
        required
      >
        <Input2
          value={formState.owner}
          onChange={(e) => updateFormState({ owner: e.target.value })}
        />
      </FormField>

      {error && <GqlError error={error} />}
    </div>
  )
}

// export function EditScmWebhookModal(
//   props: ComponentProps<typeof EditScmWebhookModalBase>
// ) {
//   return (
//     <ModalMountTransition open={props.open}>
//       <EditScmWebhookModalBase {...props} />
//     </ModalMountTransition>
//   )
// }
