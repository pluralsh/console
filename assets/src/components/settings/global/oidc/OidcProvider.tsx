// TODO: this is only partially implemented, refactored from the App codebase
import {
  Button,
  Card,
  CheckIcon,
  Chip,
  Codeline,
  Flex,
  FormField,
  IconFrame,
  InfoOutlineIcon,
  Input,
  ListBoxFooter,
  PageTitle,
  PeoplePlusIcon,
  PersonPlusIcon,
  ReturnIcon,
  Toast,
  Tooltip,
  usePrevious,
} from '@pluralsh/design-system'
import {
  BindingInput,
  fetchGroups,
  fetchUsers,
} from 'components/utils/BindingInput'
import { Body2P } from 'components/utils/typography/Text'
import {
  Group,
  OidcAuthMethod,
  OidcProviderFragment,
  User,
} from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { deepUpdate, updateCache } from 'utils/graphql'

export function OidcProvider({
  provider,
  onBack,
}: {
  provider: OidcProviderFragment
  onBack: () => void
}) {
  return (
    <div>
      <IconFrame
        clickable
        size="large"
        type="secondary"
        tooltip="View all providers"
        icon={<ReturnIcon />}
        onClick={onBack}
      />
      {JSON.stringify(provider)}
    </div>
  )
}

export function ProviderForm({
  provider,
  attributes,
  setAttributes,
  bindings,
  setBindings,
  repository,
  onSave,
  onInvite,
  onCreateGroup,
  loading,
}: any) {
  const settings = repository.oauthSettings || {}
  const [toast, setToast] = useState<any>(null)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const isMountRef = useRef(true)
  const prevAttributes = usePrevious(attributes)
  const prevBindings = usePrevious(bindings)
  const prevLoading = usePrevious(loading)

  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false

      return
    }

    if (
      !isEqual(attributes, prevAttributes) ||
      !isEqual(bindings, prevBindings)
    ) {
      setDirty(true)
    }
  }, [attributes, prevAttributes, bindings, prevBindings, isMountRef])

  useEffect(() => {
    if (prevLoading !== undefined && !loading && loading !== prevLoading) {
      setTimeout(() => setSaved(false), 5000)
    }
  }, [loading, prevLoading])

  return (
    <Card
      display="flex"
      flexDirection="column"
      gap="large"
      padding="xlarge"
    >
      <Flex
        gap="medium"
        width="100%"
      >
        <FormField
          label="Client ID"
          width="calc(66.666% - 16px)"
        >
          <Codeline>{attributes.clientId}</Codeline>
        </FormField>
        <FormField
          label="Client secret"
          width="33.333%"
        >
          <Codeline displayText="••••••••••">
            {attributes.clientSecret}
          </Codeline>
        </FormField>
      </Flex>
      <BindingInput
        label="User bindings"
        placeholder="Search for user"
        bindings={bindings
          .filter(({ user }) => !!user)
          .map(({ user: { email } }) => email)}
        customBindings={provider?.invites?.map((invite) => (
          <Tooltip label="Pending invitation">
            <Chip
              fillLevel={2}
              size="small"
              icon={<InfoOutlineIcon color="icon-xlight" />}
            >
              <Body2P $color="text-primary-disabled">{invite.email}</Body2P>
            </Chip>
          </Tooltip>
        ))}
        fetcher={fetchUsers}
        add={(user) => setBindings([...bindings, { user }])}
        remove={(email) =>
          setBindings(
            bindings.filter(({ user }) => !user || user.email !== email)
          )
        }
        dropdownFooterFixed={
          provider?.id && (
            <ListBoxFooter
              onClick={onInvite}
              leftContent={<PersonPlusIcon color="icon-info" />}
            >
              <Body2P $color="action-link-inline">Invite new user</Body2P>
            </ListBoxFooter>
          )
        }
      />
      <BindingInput
        label="Group bindings"
        placeholder="Search for group"
        bindings={bindings
          .filter(({ group }) => !!group)
          .map(({ group: { name } }) => name)}
        fetcher={fetchGroups}
        add={(group) => setBindings([...bindings, { group }])}
        remove={(name) =>
          setBindings(
            bindings.filter(({ group }) => !group || group.name !== name)
          )
        }
        dropdownFooterFixed={
          provider?.id && (
            <ListBoxFooter
              onClick={onCreateGroup}
              leftContent={<PeoplePlusIcon color="icon-info" />}
            >
              <Body2P $color="action-link-inline">Create new group</Body2P>
            </ListBoxFooter>
          )
        }
      />
      <FormField label="Redirect urls">
        <UrlsInput
          uriFormat={settings.uriFormat}
          urls={attributes.redirectUris}
          setUrls={(redirectUris) =>
            setAttributes({ ...attributes, redirectUris })
          }
        />
      </FormField>
      <Flex
        align="center"
        justify="flex-end"
        gap="medium"
      >
        <Button
          primary
          disabled={!dirty}
          onClick={() => {
            onSave()
            setDirty(false)
            setSaved(true)
          }}
          loading={loading}
        >
          Save
        </Button>
        {dirty && <Body2P $color="text-xlight">Unsaved changes</Body2P>}
        {!dirty && !loading && saved && (
          <Flex
            gap="xsmall"
            color="text-xlight"
          >
            <Body2P>Saved</Body2P>
            <CheckIcon size={12} />
          </Flex>
        )}
      </Flex>
      {toast && (
        <Toast
          severity="success"
          marginBottom="medium"
          marginRight="xxxxlarge"
          onClose={() => setToast(null)}
        >
          {toast}
        </Toast>
      )}
    </Card>
  )
}

export function CreateProvider({ installation }: any) {
  const settings = installation.repository.oauthSettings || {}
  const [attributes, setAttributes] = useState({
    redirectUris: [],
    authMethod: settings.authMethod || OidcAuthMethod.Post,
  })
  const [bindings, setBindings] = useState([])
  const [mutation, { loading, error }] = useCreateProviderMutation({
    variables: {
      installationId: installation.id,
      attributes: { ...attributes, bindings: bindings.map(sanitize) },
    },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: REPO_Q,
        variables: { repositoryId: installation.repository.id },
        update: (prev) =>
          deepUpdate(
            prev,
            'repository.installation.oidcProvider',
            () => data?.createOidcProvider
          ),
      }),
  })

  return (
    <Div paddingBottom="large">
      <PageTitle
        heading="OpenID connect users"
        paddingTop="medium"
      >
        <AppHeaderActions />
      </PageTitle>
      {error && (
        <GqlError
          error={error}
          header="Could not create provider"
        />
      )}
      <ProviderForm
        repository={installation.repository}
        attributes={attributes}
        setAttributes={setAttributes}
        bindings={bindings}
        setBindings={setBindings}
        onSave={() => mutation()}
        loading={loading}
      />
    </Div>
  )
}

const sanitize = ({
  id,
  user,
  group,
}: {
  id: Nullable<string>
  user: Nullable<User>
  group: Nullable<Group>
}) => ({
  id,
  userId: user?.id,
  groupId: group?.id,
})

enum ModalSelection {
  None,
  InviteUser,
  CreateGroup,
}

export function UpdateProvider({ installation }: any) {
  const { refetch } = useContext(AppContext)

  const provider = useMemo(
    () => installation.oidcProvider,
    [installation.oidcProvider]
  )

  const [attributes, setAttributes] = useState({
    redirectUris: provider.redirectUris,
    authMethod: provider.authMethod,
    clientId: provider.clientId,
    clientSecret: provider.clientSecret,
  })
  const [bindings, setBindings] = useState(provider.bindings)
  const [selectedModal, setSelectedModal] = useState<ModalSelection>(
    ModalSelection.None
  )

  const [mutation, { loading, error }] = useUpdateProviderMutation({
    variables: {
      installationId: installation.id,
      attributes: {
        ...{
          redirectUris: attributes.redirectUris,
          authMethod: attributes.authMethod,
        },
        bindings: bindings.map(sanitize),
      },
    },
  })

  return (
    <Div paddingBottom="large">
      <PageTitle
        heading="OpenID connect users"
        paddingTop="medium"
      >
        <AppHeaderActions />
      </PageTitle>
      {error && (
        <GqlError
          error={error}
          header="Could not update provider"
        />
      )}
      <ProviderForm
        provider={provider}
        repository={installation.repository}
        attributes={attributes}
        setAttributes={setAttributes}
        bindings={bindings}
        setBindings={setBindings}
        onSave={() => mutation()}
        loading={loading}
        onInvite={() => setSelectedModal(ModalSelection.InviteUser)}
        onCreateGroup={() => setSelectedModal(ModalSelection.CreateGroup)}
      />
      <ImpersonateServiceAccount skip>
        <>
          {selectedModal === ModalSelection.InviteUser && (
            <InviteUserModal
              onClose={() => setSelectedModal(ModalSelection.None)}
              onInvite={() => {
                refetch?.()
                setSelectedModal(ModalSelection.None)
              }}
              oidcProviderId={provider?.id}
            />
          )}
          {selectedModal === ModalSelection.CreateGroup && (
            <CreateGroupModal
              onClose={() => setSelectedModal(ModalSelection.None)}
              onCreate={(group) => {
                setBindings((bindings) => [...bindings, { group }])
                setSelectedModal(ModalSelection.None)
              }}
            />
          )}
        </>
      </ImpersonateServiceAccount>
    </Div>
  )
}
