import { GitPullIcon, ListBoxItem, PeopleIcon } from '@pluralsh/design-system'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { FlowFavoriteStar } from 'components/flows/FlowFavoriteButton'
import { flowTabPath } from 'components/flows/flowHealth'
import { MoreMenu } from 'components/utils/MoreMenu'
import { hasAccess } from 'components/utils/persona'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

function stopBubble(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function stopLink(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

export function FlowActionsMenu({
  flow,
  search,
  refetch,
  favorited,
  onToggleFavorite,
}: {
  flow: FlowBasicWithBindingsFragment
  search: string
  refetch: () => void
  favorited: boolean
  onToggleFavorite: () => void
}) {
  const { personaConfiguration } = useLogin()
  const navigate = useNavigate()
  const showPermissionsBtn = hasAccess(
    personaConfiguration,
    'flows.permissions'
  )
  const showPipelines = hasAccess(personaConfiguration, 'flows.pipelines')
  const [menuKey, setMenuKey] = useState('')
  const favoriteLabel = favorited
    ? 'Unfavorite this flow'
    : 'Favorite this flow'
  const onSelect = {
    pipelines: () => navigate(flowTabPath(flow.name, 'pipelines', search)),
    favorite: onToggleFavorite,
  }

  return (
    <ActionsSC
      onClick={stopLink}
      onPointerDown={stopBubble}
      onMouseDown={stopBubble}
    >
      <MoreMenu
        onSelectionChange={(key: string) => {
          const action = onSelect[key as keyof typeof onSelect]

          if (action) action()
          else setMenuKey(key)
        }}
      >
        {showPermissionsBtn && (
          <ListBoxItem
            key="permissions"
            label="Update permission"
            leftContent={<PeopleIcon />}
            textValue="Update permission"
          />
        )}
        {showPipelines && (
          <ListBoxItem
            key="pipelines"
            label="View pipelines"
            leftContent={<GitPullIcon />}
            textValue="View pipelines"
          />
        )}
        <ListBoxItem
          key="favorite"
          label={favoriteLabel}
          leftContent={<FlowFavoriteStar />}
          textValue={favoriteLabel}
        />
      </MoreMenu>
      {showPermissionsBtn && (
        <PermissionsModal
          id={flow.id}
          type={PermissionsIdType.Flow}
          bindings={flow}
          header="Flow permissions"
          refetch={refetch}
          open={menuKey === 'permissions'}
          onClose={() => setMenuKey('')}
        />
      )}
    </ActionsSC>
  )
}

const ActionsSC = styled.div({
  position: 'relative',
  zIndex: 1,
  pointerEvents: 'auto',
})
