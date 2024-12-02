import { CatalogCard } from '@pluralsh/design-system'
import { CatalogFragment } from '../../generated/graphql.ts'
import { useTheme } from 'styled-components'
import { getCatalogAbsPath } from '../../routes/catalogRoutesConsts.tsx'
import { useNavigate } from 'react-router-dom'
import { catalogImageUrl } from './common.ts'
import { ReactNode } from 'react'
import { isEmpty } from 'lodash'

export function CatalogsGrid({
  catalogs,
  emptyState = null,
}: {
  catalogs: CatalogFragment[]
  emptyState?: ReactNode
}) {
  const theme = useTheme()
  const navigate = useNavigate()

  if (isEmpty(catalogs)) return emptyState

  return (
    <div
      css={{
        display: 'grid',
        gap: theme.spacing.medium,
        gridTemplateColumns: 'repeat(auto-fit, minmax(256px, 1fr))',
        flexGrow: 1,
        overflow: 'auto',
        paddingBottom: theme.spacing.large,
        paddingRight: theme.spacing.xxsmall, // Additional space between scrollbar and cards.
      }}
    >
      {catalogs?.map(
        ({ id, name, author, description, category, icon, darkIcon }) => (
          <CatalogCard
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
