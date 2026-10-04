import { CaretDownIcon } from '@pluralsh/design-system'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'

export function DashboardTitleMenu({
  name,
  description,
  updatedAt,
  bare = false,
}: {
  name: string
  description?: string | null
  updatedAt?: string | null
  bare?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useOutsideClick(wrapRef, close)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (bare)
    return (
      <WrapSC>
        <TitleSC>{name}</TitleSC>
      </WrapSC>
    )

  return (
    <WrapSC ref={wrapRef}>
      <TriggerSC
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <TitleSC>{name}</TitleSC>
        <CaretSC
          $open={open}
          size={12}
          color="icon-xlight"
        />
      </TriggerSC>
      {open && (
        <PanelSC role="dialog">
          <PanelTitleSC>{name}</PanelTitleSC>
          {description ? (
            <Body2P $color="text-light">{description}</Body2P>
          ) : (
            <Body2P $color="text-xlight">No description.</Body2P>
          )}
          <CaptionP $color="text-xlight">
            {updatedAt ? `Updated ${fromNow(updatedAt)}` : 'Never updated'}
          </CaptionP>
        </PanelSC>
      )}
    </WrapSC>
  )
}

const WrapSC = styled.div({
  minWidth: 0,
  position: 'relative',
})

const TriggerSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  alignItems: 'center',
  borderRadius: theme.borderRadiuses.medium,
  cursor: 'pointer',
  display: 'flex',
  gap: theme.spacing.xsmall,
  margin: `0 -${theme.spacing.xsmall}px`,
  maxWidth: '100%',
  padding: `2px ${theme.spacing.xsmall}px`,
  '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
  '&:focus-visible': {
    outline: `1px solid ${theme.colors['border-outline-focused']}`,
  },
}))

const TitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.mono,
  color: theme.colors.text,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const CaretSC = styled(CaretDownIcon)<{ $open: boolean }>(({ $open }) => ({
  flexShrink: 0,
  transform: $open ? 'rotate(180deg)' : 'none',
  transition: 'transform 150ms ease',
}))

const PanelSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.large,
  boxShadow: theme.boxShadows.moderate,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  left: -theme.spacing.xsmall,
  maxWidth: 'min(520px, calc(100vw - 64px))',
  padding: theme.spacing.medium,
  position: 'absolute',
  top: 'calc(100% + 4px)',
  width: 520,
  zIndex: theme.zIndexes.selectPopover,
}))

const PanelTitleSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  color: theme.colors.text,
  margin: 0,
}))
