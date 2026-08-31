import {
  Button,
  Card,
  Codeline,
  FillLevelContext,
  Flex,
  FormField,
  IconFrame,
  Input,
  ReturnIcon,
} from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { BindingInput } from 'components/utils/BindingInput'
import { StackedText } from 'components/utils/table/StackedText'
import {
  GroupFragment,
  OidcAuthMethod,
  OidcProviderAttributes,
  OidcProviderFragment,
  OidcProviderType,
  UserFragment,
  useUpdateOidcProviderMutation,
} from 'generated/graphql'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { READONLY_COLOR, UrlsInput } from './OidcCreateProviderModal'
import { OidcProviderWritePermissions } from './OidcProviderWritePermissions'

export function OidcProvider({
  provider,
  onBack,
}: {
  provider: OidcProviderFragment
  onBack: () => void
}) {
  const { state, update, hasUpdates } = useUpdateState<
    OidcProviderAttributes & { users: UserFragment[]; groups: GroupFragment[] }
  >({
    authMethod: OidcAuthMethod.Post,
    name: provider.name,
    description: provider.description,
    redirectUris: provider.redirectUris,
    users:
      provider.bindings
        ?.map((binding) => binding?.user)
        .filter(isNonNullable) ?? [],
    groups:
      provider.bindings
        ?.map((binding) => binding?.group)
        .filter(isNonNullable) ?? [],
  })
  const { users, groups, ...rest } = state
  const attributes: OidcProviderAttributes = {
    ...rest,
    bindings: [
      ...users.map((user) => ({ userId: user?.id })),
      ...groups.map((group) => ({ groupId: group?.id })),
    ],
  }

  const [updateProvider, { loading, error }] = useUpdateOidcProviderMutation({
    refetchQueries: ['OidcProviders'],
    variables: {
      id: provider.id,
      type: OidcProviderType.Console,
      attributes,
    },
  })

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <HeaderSC>
        <Flex gap="small">
          <IconFrame
            clickable
            size="large"
            type="secondary"
            tooltip="View all providers"
            icon={<ReturnIcon />}
            onClick={onBack}
            css={{ flexShrink: 0 }}
          />
          <StackedText
            first={provider.name}
            firstPartialType="body1Bold"
            firstColor="text"
            second={provider.description}
          />
        </Flex>
        <OidcProviderWritePermissions provider={provider} />
      </HeaderSC>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          updateProvider()
        }}
      >
        <FormCardSC>
          <FillLevelContext value={0}>
            {error && <GqlError error={error} />}
            <ClientFieldsSC>
              <FormField
                label="Client ID"
                css={{ flex: 3 }}
              >
                <Codeline>{provider.clientId}</Codeline>
              </FormField>
              <FormField
                label="Client Secret"
                css={{ flex: 2 }}
              >
                <Codeline displayText="••••••••••">
                  {provider.clientSecret}
                </Codeline>
              </FormField>
            </ClientFieldsSC>
            <Flex
              direction="column"
              gap="medium"
            >
              <FormField label="Name">
                <Input
                  value={state.name}
                  placeholder="Enter OIDC provider name"
                  onChange={(e) => update({ ...state, name: e.target.value })}
                />
              </FormField>
              <FormField label="Description">
                <Input
                  value={state.description}
                  placeholder="Enter description"
                  onChange={(e) =>
                    update({ ...state, description: e.target.value })
                  }
                />
              </FormField>
              <BindingInput
                type="user"
                bindings={users.map((user) => user?.email)}
                add={(newUser) =>
                  !users.some((u) => u?.email === newUser.email) &&
                  update({ ...state, users: [...users, newUser] })
                }
                remove={(removedEmail) =>
                  update({
                    ...state,
                    users: users.filter((user) => user?.email !== removedEmail),
                  })
                }
              />
              <BindingInput
                type="group"
                bindings={groups.map((group) => group?.name)}
                add={(newGroup) =>
                  !groups.some((g) => g?.name === newGroup.name) &&
                  update({ ...state, groups: [...groups, newGroup] })
                }
                remove={(removedName) =>
                  update({
                    ...state,
                    groups: groups.filter(
                      (group) => group?.name !== removedName
                    ),
                  })
                }
              />
              <FormField label="Redirect URLs">
                <UrlsInput
                  urls={state.redirectUris?.filter(isNonNullable) ?? []}
                  setUrls={(urls) => update({ ...state, redirectUris: urls })}
                />
              </FormField>
            </Flex>
            <Button
              disabled={loading || !hasUpdates}
              loading={loading}
              type="submit"
              alignSelf="flex-end"
            >
              Save
            </Button>
          </FillLevelContext>
        </FormCardSC>
      </form>
    </Flex>
  )
}

const HeaderSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
})

const FormCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'auto',
  padding: theme.spacing.large,
}))

const ClientFieldsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  width: '100%',
  // makes the codelines greyed out
  '& *:has(> label) + * *': {
    color: theme.colors[READONLY_COLOR],
  },
}))
