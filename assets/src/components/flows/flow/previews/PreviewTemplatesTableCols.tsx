import { ArrowTopRightIcon, CollapseIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { PreviewEnvironmentTemplateFragment } from 'generated/graphql'
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { useTheme } from 'styled-components'

const columnHelper = createColumnHelper<PreviewEnvironmentTemplateFragment>()

export const ColExpanderWithInitialScroll = columnHelper.display({
  id: 'expander',
  header: '',
  meta: { gridTemplate: '48px' },
  cell: function Cell({ row, table: { options } }) {
    const elementRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const hasNotScrolled = options.meta?.hasScrolledToSelection === false // needs to be explicitly false not falsy
      if (elementRef.current && hasNotScrolled && row.getIsExpanded()) {
        elementRef.current.scrollIntoView({ block: 'center' })
        options.meta?.setHasScrolledToSelection?.(true)
      }
    }, [options.meta, row])

    return (
      row.getCanExpand() && (
        <CollapseIcon
          ref={elementRef}
          size={8}
          cursor="pointer"
          style={{
            alignSelf: 'center',
            transform: `rotate(${row.getIsExpanded() ? 270 : 180}deg)`,
            transition: 'transform .2s',
          }}
          onClick={(e) => {
            e.stopPropagation()
            row.getToggleExpandedHandler()()
          }}
        />
      )
    )
  },
})

export const ColName = columnHelper.accessor((template) => template.name, {
  id: 'name',
  header: 'Name',
  cell: function Cell({ getValue }) {
    return getValue()
  },
})

export const ColReferenceService = columnHelper.accessor(
  (template) => template.referenceService,
  {
    id: 'referenceService',
    header: 'Reference service',
    cell: function Cell({ getValue }) {
      const { spacing, colors } = useTheme()
      const service = getValue()
      const { flowId } = useParams()
      return (
        <InlineLink
          as={Link}
          to={getServiceDetailsPath({
            flowId,
            serviceId: service?.id,
            clusterId: service?.cluster?.id,
          })}
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xsmall,
            '&:visited': { color: colors['action-link-inline'] },
            '&:visited:hover': { color: colors['action-link-inline-hover'] },
          }}
        >
          {service?.name}
          <ArrowTopRightIcon />
        </InlineLink>
      )
    },
  }
)
