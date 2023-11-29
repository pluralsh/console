import { type FocusableElement } from '@react-types/shared'
import { type DOMAttributes, type ReactElement } from 'react'
import styled from 'styled-components'

const ControlWrap = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.xlarge,

  '.header': {
    ...theme.partials.text.body2Bold,
    color: theme.colors.text,

    '&.without-caption': {
      marginBottom: theme.spacing.medium,
    },
  },

  '.caption': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginBottom: theme.spacing.medium,
  },
}))

type ControlProps = {
  header: string
  caption?: string
  children: ReactElement | ReactElement[] | string
  labelProps?: DOMAttributes<FocusableElement>
}

export default function Control({
  header,
  caption,
  children,
  labelProps,
}: ControlProps) {
  return (
    <ControlWrap>
      <div {...labelProps}>
        <div
          className={`header ${caption ? 'with-caption' : 'without-caption'}`}
        >
          {header}
        </div>
        {caption && <div className="caption">{caption}</div>}
      </div>
      {children}
    </ControlWrap>
  )
}
