import { CatalogCard } from '@pluralsh/design-system'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import { getCatalogAbsPath } from '../../routes/catalogRoutesConsts.tsx'
import { useNavigate } from 'react-router-dom'
import { catalogImageUrl } from './common.ts'
import { ReactNode, useCallback } from 'react'
import { isEmpty } from 'lodash'

const fetchMargin = 50

export function CatalogsGrid({
  catalogs,
  emptyState,
  height,
  onBottomReached,
}: {
  catalogs: CatalogFragment[]
  emptyState?: ReactNode
  height?: number
  onBottomReached?: () => void
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(256px, 1fr))',
        flexGrow: 1,
        overflowY: 'auto',
        paddingBottom: theme.spacing.large,
        paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and cards.
        padding: theme.spacing.medium,
        height,
      }}
      onScrollCapture={(e) => handleBottomReached(e?.target as HTMLDivElement)}
    >
      {catalogs?.map(
        ({ id, name, author, description, category, icon, darkIcon }) => (
          <CatalogCard
            key={id}
            imageUrl={catalogImageUrl(icon, darkIcon, theme.mode)}
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
