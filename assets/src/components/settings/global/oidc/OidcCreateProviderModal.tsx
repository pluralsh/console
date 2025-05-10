import {
  Button,
  Chip,
  Divider,
  FillLevelContext,
  Flex,
  FormField,
  Input,
  Modal,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { BindingInput } from 'components/utils/BindingInput'
import CopyButton from 'components/utils/CopyButton'
import {
  GroupFragment,
  OidcAuthMethod,
  OidcProviderAttributes,
  OidcProviderType,
  useCreateOidcProviderMutation,
  UserFragment,
} from 'generated/graphql'
import { produce } from 'immer'
import { SetStateAction, useCallback, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

const READONLY_COLOR = 'text-input-disabled'

export function OidcCreateProviderModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      header="add new OIDC provider"
      size="large"
    >
      <OidcCreateProviderForm onClose={onClose} />
    </Modal>
  )
}

function OidcCreateProviderForm({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme()
  const [form, setForm] = useState<OidcProviderAttributes>({
    authMethod: OidcAuthMethod.Post,
    name: '',
    description: '',
    redirectUris: [],
  })
  const [users, setUsers] = useState<UserFragment[]>([])
  const [groups, setGroups] = useState<GroupFragment[]>([])

  const [createProvider, { data, loading, error }] =
    useCreateOidcProviderMutation({ refetchQueries: ['OidcProviders'] })

  const clientId = data?.createOidcProvider?.clientId
  const clientSecret = data?.createOidcProvider?.clientSecret

  return (
    <WrapperFormSC
      onSubmit={(e) => {
        e.preventDefault()
        createProvider({
          variables: {
            type: OidcProviderType.Console,
            attributes: {
              ...form,
              bindings: [
                ...users.map((user) => ({ userId: user.id })),
                ...groups.map((group) => ({ groupId: group.id })),
              ],
            },
          },
        })
      }}
    >
      {error && <GqlError error={error} />}
      <Flex
        direction="column"
        gap="large"
        overflow="auto"
      >
        <FormField label="Client ID">
          <Input
            disabled
            endIcon={
              clientId && (
                <CopyButton
                  text={clientId}
                  type="tertiary"
                  tooltip="Copy"
                  iconColor={READONLY_COLOR}
                />
              )
            }
            inputProps={{
              css: { '&, &::placeholder': { color: colors[READONLY_COLOR] } },
            }}
            value={clientId}
            placeholder="A client ID will be generated upon creation"
          />
        </FormField>
        <FormField label="Client Secret">
          <Input
            disabled
            endIcon={
              clientSecret && (
                <CopyButton
                  text={clientSecret}
                  type="tertiary"
                  tooltip="Copy"
                  iconColor={READONLY_COLOR}
                />
              )
            }
            inputProps={{
              css: { '&, &::placeholder': { color: colors[READONLY_COLOR] } },
            }}
            value={clientSecret}
            placeholder="A client secret will be generated upon creation"
          />
        </FormField>
        <Divider backgroundColor="border-input" />
        <FillLevelContext value={0}>
          <Flex
            direction="column"
            gap="medium"
          >
            <FormField label="Name">
              <Input
                value={form.name}
                placeholder="Enter OIDC provider name"
                onChange={(e) =>
                  updateForm(setForm, (d) => {
                    d.name = e.target.value
                  })
                }
              />
            </FormField>
            <FormField label="Description">
              <Input
                value={form.description}
                placeholder="Enter description"
                onChange={(e) =>
                  updateForm(setForm, (d) => {
                    d.description = e.target.value
                  })
                }
              />
            </FormField>
            <BindingInput
              type="user"
              bindings={users.map((user) => user.email)}
              add={(user) =>
                !users.includes(user) && setUsers([...users, user])
              }
              remove={(removedEmail) =>
                setUsers(users.filter((user) => user?.email !== removedEmail))
              }
            />
            <BindingInput
              type="group"
              bindings={groups.map((group) => group.name)}
              add={(group) =>
                !groups.includes(group) && setGroups([...groups, group])
              }
              remove={(removedName) =>
                setGroups(groups.filter((group) => group?.name !== removedName))
              }
            />
            <FormField label="Redirect URLs">
              <UrlsInput
                urls={form.redirectUris?.filter(isNonNullable) ?? []}
                setUrls={(urls) =>
                  updateForm(setForm, (d) => {
                    d.redirectUris = urls
                  })
                }
              />
            </FormField>
          </Flex>
        </FillLevelContext>
      </Flex>
      <Flex
        justifyContent="space-between"
        width="100%"
      >
        <Button
          secondary
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          disabled={!!data}
          loading={loading}
          type="submit"
        >
          {!!data ? 'Created' : 'Create'}
        </Button>
      </Flex>
    </WrapperFormSC>
  )
}

const WrapperFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'auto',
}))

export function UrlsInput({
  uriFormat = 'https://{domain}/oauth2/callback',
  urls,
  setUrls,
}: {
  uriFormat?: string
  urls: string[]
  setUrls: (urls: string[]) => void
}) {
  const [value, setValue] = useState('')
  const [scheme, path] = uriFormat.split('{domain}').filter((v) => !!v)

  const addUrl = useCallback(() => {
    const url = `${scheme}${value}${path}`

    if (url === `${scheme}${path}` || urls.includes(url)) return

    setUrls([...urls, url])
    setValue('')
  }, [value, scheme, path, urls, setUrls])

  const removeUrl = useCallback(
    (url) => setUrls(urls.filter((item) => item !== url)),
    [setUrls, urls]
  )

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Flex
        align="center"
        gap="small"
      >
        <Input
          value={value}
          prefix={scheme}
          suffix={path}
          width="100%"
          borderRadius="normal"
          placeholder={uriFormat ? 'Enter a domain' : 'Enter a redirect URL'}
          onChange={({ target: { value } }) => setValue(value)}
        />
        <Button
          secondary
          onClick={addUrl}
        >
          Add
        </Button>
      </Flex>
      <Flex
        align="stretch"
        wrap="wrap"
        gap="xxsmall"
      >
        {urls.map((url, i) => (
          <Chip
            key={i}
            size="small"
            hue="lighter"
            clickable
            closeButton
            onClick={() => removeUrl(url)}
          >
            {url}
          </Chip>
        ))}
      </Flex>
    </Flex>
  )
}

function updateForm<T>(
  setForm: (updater: SetStateAction<T>) => void,
  updater: (draft: T) => void
) {
  setForm((prev) => produce(prev, updater))
}
