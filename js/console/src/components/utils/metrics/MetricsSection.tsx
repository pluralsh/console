import { CaretDownIcon } from '@pluralsh/design-system'
import { Body1P, CaptionP } from 'components/utils/typography/Text'
import { type ReactNode, useState } from 'react'
import styled from 'styled-components'

/** Collapsible, hairline-bordered group of dashboard panels; content unmounts while collapsed. */
export function MetricsSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: ReactNode
  description?: Nullable<ReactNode>
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <SectionSC>
      <SectionHeaderSC
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SectionCaretSC
          $open={open}
          size={12}
          color="icon-xlight"
        />
        <SectionTitleBlockSC>
          <Body1P>{title}</Body1P>
          {description && (
            <CaptionP $color="text-xlight">{description}</CaptionP>
          )}
        </SectionTitleBlockSC>
      </SectionHeaderSC>
      {open && <SectionContentSC>{children}</SectionContentSC>}
    </SectionSC>
  )
}

const SectionSC = styled.section(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  // overflow:hidden zeroes the flex min-height, so without this sections get
  // squashed (and clipped) inside height-bounded scroll containers
  flexShrink: 0,
  overflow: 'hidden',
  width: '100%',
}))

const SectionHeaderSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  backgroundColor: theme.colors['fill-one'],
  color: theme.colors.text,
  cursor: 'pointer',
  display: 'flex',
  gap: theme.spacing.small,
  minHeight: 44,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  textAlign: 'left',
  width: '100%',
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
  '&:focus-visible': {
    outline: `1px solid ${theme.colors['border-outline-focused']}`,
    outlineOffset: -1,
  },
}))

const SectionCaretSC = styled(CaretDownIcon)<{ $open: boolean }>(
  ({ $open }) => ({
    flexShrink: 0,
    transform: $open ? 'rotate(0deg)' : 'rotate(-90deg)',
    transition: 'transform 150ms ease',
  })
)

const SectionTitleBlockSC = styled.div(({ theme }) => ({
  alignItems: 'baseline',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.small,
  minWidth: 0,
}))

const SectionContentSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
}))
