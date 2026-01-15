import { SpinnerAlt, ListBoxItem, GraphQLToast } from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { MoreMenu } from 'components/utils/MoreMenu'
import {
  InfraResearchFragment,
  useUpdateInfraResearchMutation,
} from 'generated/graphql'
import { isNil } from 'lodash'
import { useTheme } from 'styled-components'

export function InfraResearchShareMenu({
  infraResearch,
}: {
  infraResearch: Nullable<InfraResearchFragment>
}) {
  const { spacing } = useTheme()
  const [updateResearch, { loading, error }] = useUpdateInfraResearchMutation()

  if (isNil(infraResearch?.published)) return null

  const { id, published } = infraResearch

  return (
    <>
      <MoreMenu
        width={256}
        loading={loading}
        selectedKey={infraResearch.published ? 'My team' : 'Only me'}
        onSelectionChange={(key) => {
          if (loading || key === boolToKey(published)) return
          updateResearch({
            variables: { id, attributes: { published: keyToBool(key) } },
          })
        }}
        dropdownHeaderFixed={
          <Overline
            css={{ padding: `${spacing.xxsmall}px ${spacing.medium}px` }}
          >
            Share research
          </Overline>
        }
        triggerProps={{
          iconFrameType: 'secondary',
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

const boolToKey = (published: boolean) => (published ? 'My team' : 'Only me')
const keyToBool = (key: string) => (key === 'My team' ? true : false)
