import {
  Button,
  Codeline,
  Flex,
  FormField,
  IconFrame,
  Input2,
  KeyIcon,
  Modal,
  Switch,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { AccessTokensCreateScope } from 'components/profile/access-tokens/AccessTokensCreateScope'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { Body1P, Body2P, StrongSC } from 'components/utils/typography/Text'
import UserInfo from 'components/utils/UserInfo'
import {
  useDeleteUserMutation,
  UserFragment,
  useServiceAccountAccessTokenMutation,
} from 'generated/graphql.ts'
import { isEmpty } from 'lodash'
import { FormEvent, useMemo, useState } from 'react'
import styled from 'styled-components'

const columnHelper = createColumnHelper<UserFragment>()

const ColInfo = columnHelper.accessor((user) => user, {
  id: 'info',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    return <UserInfo user={getValue()} />
  },
})

const ColActions = columnHelper.accessor((user) => user, {
  id: 'actions',
  cell: function Cell({ table, getValue }) {
    const user = getValue()
    const isAdmin = !!table.options.meta?.isAdmin
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [createTokenOpen, setCreateTokenOpen] = useState(false)

    const [mutation, { loading, error }] = useDeleteUserMutation({
      variables: { id: user.id },
      onCompleted: () => setConfirmOpen(false),
      refetchQueries: ['ServiceAccounts'],
      awaitRefetchQueries: true,
    })

    if (!isAdmin) return null

    return (
      <Flex
        gap="xsmall"
        align="center"
      >
        <Button
          small
          secondary
          startIcon={<KeyIcon />}
          onClick={() => setCreateTokenOpen(true)}
        >
          Create access token
        </Button>
        <IconFrame
          clickable
          icon={<TrashCanIcon color="icon-danger" />}
          onClick={() => setConfirmOpen(true)}
          tooltip="Delete"
        />
        <Confirm
          open={confirmOpen}
          loading={loading}
          error={error}
          close={() => setConfirmOpen(false)}
          destructive
          label="Delete service account"
          title="Delete service account"
          submit={() => mutation()}
          text={`Are you sure you want to delete the "${user.email}" service account?`}
        />
        <Modal
          header="Create access token"
          open={createTokenOpen}
          onClose={() => setCreateTokenOpen(false)}
          size="large"
        >
          <CreateServiceAccountTokenForm
            serviceAccount={user}
            onClose={() => setCreateTokenOpen(false)}
          />
        </Modal>
      </Flex>
    )
  },
})

function CreateServiceAccountTokenForm({
  serviceAccount,
  onClose,
}: {
  serviceAccount: UserFragment
  onClose: () => void
}) {
  const [refresh, setRefresh] = useState(false)
  const [expiry, setExpiry] = useState('')
  const [addScopes, setAddScopes] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  const [mutation, { data, loading, error }] =
    useServiceAccountAccessTokenMutation({
      variables: {
        id: serviceAccount.id,
        refresh,
        attributes: {
          ...(expiry && { expiry }),
          ...(addScopes && {
            scopes: [{ apis: selectedScopes, identifier: '*' }],
          }),
        },
      },
    })

  const scopesValid = useMemo(
    () => !addScopes || !isEmpty(selectedScopes),
    [addScopes, selectedScopes]
  )

  const allowSubmit = !loading && scopesValid
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (allowSubmit) mutation()
  }

  const token = data?.serviceAccountAccessToken?.token
  const actions = token ? (
    <Button
      secondary
      type="button"
      onClick={onClose}
      alignSelf="end"
    >
      Close
    </Button>
  ) : (
    <Flex gap="small">
      <Switch
        checked={addScopes}
        onChange={setAddScopes}
        css={{ flex: 1 }}
      >
        Configure access scopes
      </Switch>
      <Button
        secondary
        type="button"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        loading={loading}
        disabled={!scopesValid}
      >
        Create
      </Button>
    </Flex>
  )
  return (
    <WrapperFormSC onSubmit={onSubmit}>
      <Flex
        direction="column"
        gap="small"
        overflow="auto"
      >
        {token ? (
          <>
            <Body2P $color="text-light">
              New access token created. Make sure to copy it now as you will not
              be able to see it again.
            </Body2P>
            <Codeline>{token}</Codeline>
          </>
        ) : (
          <>
            <Body1P $color="text-light">
              Create a new access token for the{' '}
              <StrongSC $color="text">{serviceAccount.email}</StrongSC> service
              account.
            </Body1P>
            <FormField
              label="Expiry"
              hint="TTL of the access token, e.g. 1h, 1d, 1w. Leave blank for no expiry."
            >
              <Input2
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="e.g. 1d"
              />
            </FormField>
            <Switch
              checked={refresh}
              onChange={setRefresh}
            >
              Wipe old tokens for this service account
            </Switch>
            {addScopes && (
              <Flex direction="column">
                <AccessTokensCreateScope
                  selectedScopes={selectedScopes}
                  setSelectedScopes={setSelectedScopes}
                />
              </Flex>
            )}
            {error && (
              <GqlError
                header="Problem creating token"
                error={error}
              />
            )}
          </>
        )}
      </Flex>
      {actions}
    </WrapperFormSC>
  )
}

const WrapperFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
}))

export const serviceAccountsCols = [ColInfo, ColActions]
