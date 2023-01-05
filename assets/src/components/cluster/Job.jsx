import { useCallback, useState } from 'react'
import { Box } from 'grommet'
import { useMutation } from 'react-apollo'
import { Confirm, Trash } from 'forge-core'
import { ignoreEvent } from 'components/utils/events'

import { DELETE_JOB } from './queries'

export function DeleteIcon({ onClick, loading }) {
  return (
    <Box
      flex={false}
      pad="small"
      round="xsmall"
      align="center"
      justify="center"
      onClick={onClick}
      hoverIndicator="backgroundDark"
      focusIndicator={false}
    >
      <Trash
        color={loading ? 'dark-6' : 'error'}
        size="small"
      />
    </Box>
  )
}

export function DeleteJob({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_JOB, {
    variables: { name, namespace },
    onCompleted: () => {
      setConfirm(false); refetch()
    },
  })

  const doConfirm = useCallback(e => {
    ignoreEvent(e)
    setConfirm(true)
  }, [setConfirm])

  return (
    <>
      <DeleteIcon
        onClick={doConfirm}
        loading={loading}
      />
      {confirm && (
        <Confirm
          description="The pod will be replaced by it's managing controller"
          loading={loading}
          cancel={e => {
            ignoreEvent(e); setConfirm(false)
          }}
          submit={e => {
            ignoreEvent(e); mutation()
          }}
        />
      )}
    </>
  )
}
