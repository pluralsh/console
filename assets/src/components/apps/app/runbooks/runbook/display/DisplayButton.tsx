import { Banner, Button } from '@pluralsh/design-system'
import { ApolloError } from 'apollo-boost'
import { useContext, useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate, useParams } from 'react-router-dom'

import { legacyUrl } from 'helpers/url'

import { ActionPortal } from '../Runbook'

import { DisplayContext } from '../RunbookDisplay'
import { EXECUTE_RUNBOOK } from '../../queries'

function getButton({ primary, key, ...props }: any) {
  return (
    <Button
      key={key}
      primary={primary}
      {...props}
    >
      {props.label}
    </Button>
  )
}

export function DisplayButton({ attributes: { action, headline, ...rest } }) {
  const navigate = useNavigate()
  const { appName, runbookName } = useParams()
  const { context } = useContext(DisplayContext)
  const [error, setError] = useState<ApolloError>()
  const [mutation, { loading }] = useMutation(EXECUTE_RUNBOOK, {
    variables: {
      name: runbookName,
      namespace: appName,
      input: { context: JSON.stringify(context), action },
    },
    onCompleted: ({ executeRunbook: { redirectTo } }) => {
      if (redirectTo) navigate(legacyUrl(redirectTo))
    },
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
  })

  if (!action) return getButton(rest)

  const children = (
    <>
      {error && (
        <Banner
          heading="Error executing runbook"
          severity="error"
          position="fixed"
          bottom={16}
          right={100}
          zIndex={100}
          onClose={() => setError(undefined)}
        >
          {error.message}
        </Banner>
      )}
      {getButton({
        ...rest,
        loading,
        fontWeight: headline ? 600 : 400,
        onClick: mutation,
      })}
    </>
  )

  return headline ? <ActionPortal>{children}</ActionPortal> : children
}
