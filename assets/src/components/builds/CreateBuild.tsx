import { ThemeContext } from '@emotion/react'
import {
  Banner,
  Button,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { ApolloError } from 'apollo-boost'
import { getIcon, hasIcons } from 'components/apps/misc'
import { BUILDS_Q, CREATE_BUILD } from 'components/graphql/builds'
import { InstallationContext } from 'components/Installations'
import { BuildTypes } from 'components/types'
import { A, P } from 'honorable'
import {
  Key,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useMutation } from 'react-apollo'
import { appendConnection, updateCache } from 'utils/graphql'

const BUILD_TYPES = [
  { key: BuildTypes.DEPLOY, value: 'Deployment' },
  { key: BuildTypes.APPROVAL, value: 'Approval' },
  { key: BuildTypes.BOUNCE, value: 'Bounce' },
]

export default function CreateBuild() {
  const { applications } = useContext<any>(InstallationContext)
  const { dark } = useContext<any>(ThemeContext)
  const [open, setOpen] = useState<boolean>(false)
  const [selectedApp, setSelectedApp] = useState<Key>()
  const [selectedType, setSelectedType] = useState<Key>()
  const [success, setSuccess] = useState<any>()
  const [error, setError] = useState<ApolloError>()

  const currentApp = useMemo(() => applications.find(app => app.name === selectedApp), [applications, selectedApp])
  const reset = useCallback(() => {
    setSelectedApp(undefined)
    setSelectedType(undefined)
    setOpen(false)
  }, [])

  const [mutation, { loading }] = useMutation(CREATE_BUILD, {
    onCompleted: success => {
      reset()
      setSuccess(success)
      setTimeout(() => setSuccess(undefined), 3000)
    },
    onError: error => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
    update: (cache, { data: { createBuild } }) => updateCache(cache, {
      query: BUILDS_Q,
      update: prev => appendConnection(prev, createBuild, 'builds'),
      variables: {},
    }),
  })
// onCompleted: () => reset(),

  const deploy = useCallback(() => {
    mutation({ variables: { attributes: { type: selectedType, repository: selectedApp, message: 'Deployed from console' } } })
  }, [mutation, selectedApp, selectedType])

  return (
    <>
      <Button
        fontWeight={600}
        onClick={() => setOpen(true)}
      >
        Create build
      </Button>
      {open && (
        <Modal
          header="Create build"
          open={open}
          onClose={reset}
          actions={(
            <>
              <Button
                secondary
                onClick={reset}
              >
                Cancel
              </Button>
              <Button
                onClick={deploy}
                disabled={!selectedApp || !selectedType}
                loading={loading}
                marginLeft="medium"
              >
                Create build
              </Button>
            </>
          )}
        >
          <P
            fontSize={14}
            fontWeight={600}
            marginBottom="xsmall"
          >
            App
          </P>
          <Select
            aria-label="app"
            label="Choose an app"
            leftContent={(!!currentApp && hasIcons(currentApp)) ? (
              <img
                src={getIcon(currentApp, dark)}
                height={16}
              />
            ) : undefined}
            selectedKey={selectedApp}
            onSelectionChange={setSelectedApp}
          >
            {applications.map(app => (
              <ListBoxItem
                key={app.name}
                label={app.name}
                textValue={app.name}
                leftContent={hasIcons(app) ? (
                  <img
                    src={getIcon(app, dark)}
                    height={16}
                  />
                ) : undefined}
              />
            ))}
          </Select>
          <P
            fontSize={14}
            fontWeight={600}
            marginTop="large"
            marginBottom="xsmall"
          >
            Type of build
          </P>
          <Select
            aria-label="type"
            label="Choose build type"
            selectedKey={selectedType}
            onSelectionChange={setSelectedType}
          >
            {BUILD_TYPES.map(({ key, value }) => (
              <ListBoxItem
                key={key}
                label={value}
                textValue={value}
              />
            ))}
          </Select>
        </Modal>
      )}
      {success && (
        <Banner
          heading="This deployment action was not permitted"
          severity="success"
          position="fixed"
          bottom={16}
          right={100}
          zIndex={1000}
          onClose={() => setSuccess(undefined)}
        >
          Build created
          {/* TODO: Update link */}
          <A inline>View build</A>
        </Banner>
      )}
      {error && (
        <Banner
          heading="This deployment action was not permitted"
          severity="error"
          position="fixed"
          bottom={16}
          right={100}
          zIndex={1000}
          onClose={() => setError(undefined)}
        >
          {error.message}
        </Banner>
      )}
    </>
  )
}
