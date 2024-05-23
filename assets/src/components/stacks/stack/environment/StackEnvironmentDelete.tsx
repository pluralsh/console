import React, { useState } from 'react'
import { InlineCode } from '@pluralsh/design-system'
import { useOutletContext, useParams } from 'react-router-dom'

import {
  StackEnvironment,
  useUpdateStackMutation,
} from '../../../../generated/graphql'
import { DeleteIconButton } from '../../../utils/IconButtons'
import { Confirm } from '../../../utils/Confirm'

import { StackOutletContextT } from '../Stack'

export default function StackEnvironmentDelete({
  env,
}: {
  env: StackEnvironment
}) {
  const { stackId = '' } = useParams()
  const { stack, refetch } = useOutletContext() as StackOutletContextT
  const [confirm, setConfirm] = useState(false)

  // TODO: Use merge mutation once it will be available.
  const [mutation, { loading, error }] = useUpdateStackMutation({
    variables: {
      id: stackId,
      attributes: {
        name: stack.name,
        type: stack.type,
        configuration: {
          image: stack.configuration.image,
          version: stack.configuration.version,
        },
        clusterId: stack.cluster?.id ?? '',
        repositoryId: stack.repository?.id ?? '',
        git: { folder: stack.git.folder, ref: stack.git.ref },
        environment: stack.environment
          ?.filter((e) => e?.name !== env.name)
          .map((e) => ({
            name: e?.name ?? '',
            value: e?.value ?? '',
            secret: e?.secret,
          })),
      },
    },
    onCompleted: () => {
      refetch?.()
      setConfirm(false)
    },
  })

  return (
    <>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        open={confirm}
        title="Delete environment variable"
        text={
          <>
            Are you sure you want to delete <InlineCode>{env.name}</InlineCode>{' '}
            environment variable?
          </>
        }
        close={() => setConfirm(false)}
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}
