import {
  Button,
  ComboBox,
  Flex,
  FormField,
  KeyIcon,
  ListBoxFooterPlus,
  ListBoxItem,
  Modal,
  SearchIcon,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { useLogin } from 'components/contexts'
import { GqlError, GqlErrorType } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body1P } from 'components/utils/typography/Text'
import {
  ServiceAccountsQuery,
  ServiceAccountsQueryVariables,
  useImpersonateServiceAccountMutation,
  UserFragment,
  useServiceAccountsQuery,
} from 'generated/graphql'
import { startServiceAccountImpersonation } from 'helpers/impersonation'
import { FormEvent, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

export function ServiceAccountImpersonationModal({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const theme = useTheme()
  const { me } = useLogin()
  const [error, setError] = useState<GqlErrorType>()
  const [switching, setSwitching] = useState(false)
  const [selectedServiceAccount, setSelectedServiceAccount] =
    useState<UserFragment>()

  const [impersonateServiceAccount, { loading: impersonateLoading }] =
    useImpersonateServiceAccountMutation()
  const close = () => {
    if (switching) return
    setOpen(false)
    setError(undefined)
    setSelectedServiceAccount(undefined)
  }

  const impersonateSelectedServiceAccount = async () => {
    if (!selectedServiceAccount?.email) {
      setError('Select a service account.')
      return
    }

    setSwitching(true)
    setError(undefined)

    try {
      const { data } = await impersonateServiceAccount({
        variables: { email: selectedServiceAccount.email },
      })
      const jwt = data?.impersonateServiceAccount?.jwt

      if (!jwt) throw new Error('Impersonation did not return a JWT.')

      startServiceAccountImpersonation(jwt, me?.email)
      ;(window as Window).location.reload()
      return
    } catch (err) {
      setError(err as GqlErrorType)
      setSwitching(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    impersonateSelectedServiceAccount()
  }

  return (
    <Modal
      header="Impersonate service account"
      open={open}
      onClose={close}
      size="large"
      asForm
      formProps={{ onSubmit }}
      actions={
        <Flex
          gap="small"
          width="100%"
          justify="flex-end"
        >
          <Button
            secondary
            type="button"
            onClick={close}
            disabled={switching}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={switching || impersonateLoading}
            disabled={!selectedServiceAccount}
          >
            Impersonate
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="medium"
      >
        <Body1P $color="text-light">
          Authenticate this browser session as a service account. Your current
          session will be saved so you can restore it from the profile menu.
        </Body1P>
        <ServiceAccountSelect
          selectedServiceAccount={selectedServiceAccount}
          setSelectedServiceAccount={setSelectedServiceAccount}
        />
        {error && (
          <div css={{ marginTop: theme.spacing.small }}>
            <GqlError
              header="Unable to impersonate service account"
              error={error}
            />
          </div>
        )}
      </Flex>
    </Modal>
  )
}

function ServiceAccountSelect({
  selectedServiceAccount,
  setSelectedServiceAccount,
}: {
  selectedServiceAccount?: UserFragment
  setSelectedServiceAccount: (serviceAccount?: UserFragment) => void
}) {
  const theme = useTheme()
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 150)
  const { data, loading, error, pageInfo, fetchNextPage } =
    useFetchPaginatedData<ServiceAccountsQuery, ServiceAccountsQueryVariables>(
      {
        queryHook: useServiceAccountsQuery,
        keyPath: ['serviceAccounts'],
        pageSize: 20,
      },
      { q: debouncedQ || undefined }
    )
  const serviceAccounts = useMemo(
    () => mapExistingNodes(data?.serviceAccounts),
    [data?.serviceAccounts]
  )

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <FormField label="Service account">
        <ComboBox
          inputProps={{
            placeholder: selectedServiceAccount
              ? selectedServiceAccount.email
              : 'Search service accounts',
          }}
          inputValue={q}
          onInputChange={setQ}
          startIcon={selectedServiceAccount ? <KeyIcon /> : <SearchIcon />}
          loading={loading}
          selectedKey={selectedServiceAccount?.id ?? ''}
          dropdownFooterFixed={
            pageInfo?.hasNextPage && (
              <ListBoxFooterPlus onClick={() => fetchNextPage()}>
                Load more
              </ListBoxFooterPlus>
            )
          }
          onSelectionChange={(key) => {
            const serviceAccount = serviceAccounts.find(
              (account) => account.id === key
            )

            if (serviceAccount) {
              setSelectedServiceAccount(serviceAccount)
              setQ('')
            }
          }}
        >
          {serviceAccounts.length > 0 ? (
            serviceAccounts.map((serviceAccount) => (
              <ListBoxItem
                key={serviceAccount.id}
                label={serviceAccount.name}
                textValue={`${serviceAccount.name} ${serviceAccount.email}`}
                description={serviceAccount.email}
                leftContent={<KeyIcon size={16} />}
              />
            ))
          ) : (
            <ListBoxItem
              key="empty"
              label={
                q
                  ? 'No service accounts match your search'
                  : 'No service accounts found'
              }
            />
          )}
        </ComboBox>
      </FormField>
      {error && (
        <div css={{ marginTop: theme.spacing.small }}>
          <GqlError
            header="Unable to load service accounts"
            error={error}
          />
        </div>
      )}
    </Flex>
  )
}
