import {
  Banner,
  Button,
  ComboBox,
  FormField,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { getIcon, hasIcons } from 'components/apps/misc'
import { BUILDS_Q, CREATE_BUILD } from 'components/graphql/builds'
import { InstallationContext } from 'components/Installations'
import { BuildTypes } from 'components/types'
import { A, Flex } from 'honorable'
import {
  Key,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ApolloError, useMutation } from '@apollo/client'
import { appendConnection, updateCache } from 'utils/graphql'
import Fuse from 'fuse.js'

const BUILD_TYPES = [
  { key: BuildTypes.DEPLOY, value: 'Deployment' },
  { key: BuildTypes.APPROVAL, value: 'Approval' },
  { key: BuildTypes.BOUNCE, value: 'Bounce' },
]

const searchOptions = {
  keys: ['name'],
  threshold: 0.25,
}

export default function CreateBuild() {
  const { applications } = useContext<any>(InstallationContext)
  const [open, setOpen] = useState<boolean>(true)
  const [inputValue, setInputValue] = useState('')
  const [selectedApp, setSelectedApp] = useState<Key>()
  const [selectedType, setSelectedType] = useState<Key>()
  const [success, setSuccess] = useState<string>()
  const [error, setError] = useState<ApolloError>()

  const currentApp = useMemo(() => applications.find(app => app.name === inputValue), [applications, inputValue])

  const filteredApps = useMemo(() => {
    const fuse = new Fuse(applications, searchOptions)

    return inputValue
      ? fuse.search(inputValue).map(({ item }) => item)
      : applications
  }, [applications, inputValue])

  const reset = useCallback(() => {
    setInputValue('')
    setSelectedApp(undefined)
    setSelectedType(undefined)
    setOpen(false)
  }, [])

  const [mutation, { loading }] = useMutation(CREATE_BUILD, {
    onCompleted: result => {
      reset()
      setSuccess(result?.createBuild?.id)
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

  const deploy = useCallback(() => {
    mutation({ variables: { attributes: { type: selectedType, repository: selectedApp, message: 'Deployed from console' } } })
  }, [mutation, selectedApp, selectedType])

  const onSelectionChange = key => {
    if (key) {
      setSelectedApp(key)
      setInputValue(key)
    }
  }

  const onInputChange = value => {
    setSelectedApp(undefined)
    setInputValue(value)
  }

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
          <Flex
            direction="column"
            gap="small"
          >
            <FormField label="App">
              <ComboBox
                aria-label="app"
                inputValue={inputValue}
                onSelectionChange={onSelectionChange}
                onInputChange={onInputChange}
                inputProps={{ placeholder: 'Choose an app' }}
                startIcon={(!!currentApp && hasIcons(currentApp)) ? (
                  <img
                    src={getIcon(currentApp)}
                    height={16}
                  />
                ) : undefined}
                selectedKey={selectedApp}
                maxHeight={200}
              >
                {filteredApps.map(app => (
                  <ListBoxItem
                    key={app.name}
                    label={app.name}
                    textValue={app.name}
                    leftContent={hasIcons(app) ? (
                      <img
                        src={getIcon(app)}
                        height={16}
                      />
                    ) : undefined}
                  />
                ))}
              </ComboBox>
            </FormField>
            <FormField label="Type of build">
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
            </FormField>
          </Flex>
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
          Build created&nbsp;
          <A
            inline
            href={`/builds/${success}`}
          >
            View build
          </A>
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
