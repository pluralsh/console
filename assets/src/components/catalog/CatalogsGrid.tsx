import { CatalogCard } from '@pluralsh/design-system'
import { CatalogFragment } from '../../generated/graphql.ts'
import { CSSProperties, useTheme } from 'styled-components'
import { getCatalogAbsPath } from '../../routes/catalogRoutesConsts.tsx'
import { useNavigate } from 'react-router-dom'
import { ReactNode, useCallback } from 'react'
import { isEmpty } from 'lodash'
import { iconUrl } from '../../utils/icon.ts'

const fetchMargin = 50

export function CatalogsGrid({
  catalogs,
  emptyState,
  onBottomReached,
  styles,
}: {
  catalogs: CatalogFragment[]
  emptyState?: ReactNode
  onBottomReached?: () => void
  styles?: CSSProperties
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  const handleBottomReached = useCallback(
    (element?: HTMLDivElement | undefined) => {
      if (!onBottomReached || !element) return

      const { scrollHeight, scrollTop, clientHeight } = element
      if (scrollHeight - scrollTop - clientHeight < fetchMargin) {
        onBottomReached()
      }
    },
    [onBottomReached]
  )

  if (isEmpty(catalogs)) return emptyState

  return (
    <div
      css={{
        display: 'grid',
        gap: theme.spacing.medium,
        gridTemplateColumns: 'repeat(auto-fill, minmax(256px, 1fr))',
        flexGrow: 1,
        overflowY: 'auto',
        paddingBottom: theme.spacing.large,
        paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and cards.
        ...styles,
      }}
      onScrollCapture={(e) => handleBottomReached(e?.target as HTMLDivElement)}
    >
      {catalogs?.map(
        ({ id, name, author, description, category, icon, darkIcon }) => (
          <CatalogCard
            key={id}
            imageUrl={iconUrl(icon, darkIcon, theme.mode)}
            name={name}
            author={author ?? undefined}
            description={description ?? undefined}
            category={category ?? undefined}
            onClick={() => navigate(getCatalogAbsPath(id))}
          />
        )
      )}
    </div>
  )
}
