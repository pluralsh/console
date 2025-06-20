import { CatalogCard } from '@pluralsh/design-system'
import { CatalogFragment } from 'generated/graphql'
import { CSSProperties, useTheme } from 'styled-components'
import { getCatalogAbsPath } from 'routes/selfServiceRoutesConsts'
import { useNavigate } from 'react-router-dom'
import { ReactNode, useCallback } from 'react'
import { isEmpty } from 'lodash'
import { iconUrl } from 'utils/icon'

const fetchMargin = 50

type CardGridProps = {
  onBottomReached?: () => void
  styles?: CSSProperties
  children?: ReactNode
}

export function CatalogsGrid({
  catalogs,
  emptyState,
  ...props
}: {
  catalogs: CatalogFragment[]
  emptyState?: ReactNode
} & CardGridProps) {
  const theme = useTheme()
  const navigate = useNavigate()

  if (isEmpty(catalogs)) return emptyState

  return (
    <CardGrid {...props}>
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
    </CardGrid>
  )
}
export function CardGrid({ onBottomReached, styles, children }: CardGridProps) {
  const theme = useTheme()

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
      onScrollCapture={(e) => handleBottomReached(e?.currentTarget)}
    >
      {children}
    </div>
  )
}
