import { ApolloError } from '@apollo/client'
import { GraphQLToast, ListBoxItem, SpinnerAlt } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useTheme } from 'styled-components'

export function InfraResearchPublishMenu({
  isShared,
  setIsShared,
  loading,
  error,
  label = 'Share',
}: {
  isShared: Nullable<boolean>
  setIsShared: (shared: boolean) => void
  loading: boolean
  error?: ApolloError
  label?: string
}) {
  const { spacing } = useTheme()

  return (
    <>
      <MoreMenu
        width={256}
        loading={loading}
        selectedKey={boolToKey(isShared)}
        onSelectionChange={(key) => {
          if (loading || key === boolToKey(isShared)) return
          setIsShared(keyToBool(key))
        }}
        dropdownHeaderFixed={
          <Overline
            css={{
              padding: `${spacing.small}px ${spacing.medium}px ${spacing.xsmall}px`,
            }}
          >
            {label}
          </Overline>
        }
        triggerProps={{
          iconFrameType: 'secondary',
          size: 'large',
          ...(loading && { icon: <SpinnerAlt /> }),
        }}
      >
        <ListBoxItem
          key="Only me"
          label="Only me"
        />
        <ListBoxItem
          key="My team"
          label="My team"
        />
      </MoreMenu>
      <GraphQLToast
        show={!!error}
        closeTimeout={6000}
        error={error}
        header="Error updating share settings"
        margin="xxlarge"
      />
    </>
  )
}

const boolToKey = (shared: Nullable<boolean>) =>
  shared ? 'My team' : 'Only me'
const keyToBool = (key: string) => key === 'My team'
