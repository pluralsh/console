import { type ReactNode, type Ref, forwardRef, useEffect } from 'react'
import { Flex, H1, Modal as HonorableModal, type ModalProps } from 'honorable'
import PropTypes from 'prop-types'

import styled, { type StyledComponentPropsWithRef } from 'styled-components'

import { type ColorKey, type SeverityExt } from '../types'

import useLockedBody from '../hooks/useLockedBody'

import CheckRoundedIcon from './icons/CheckRoundedIcon'
import type createIcon from './icons/createIcon'
import ErrorIcon from './icons/ErrorIcon'
import WarningIcon from './icons/WarningIcon'
import InfoIcon from './icons/InfoIcon'

export const SEVERITIES = [
  'info',
  'warning',
  'success',
  'danger',
] as const satisfies Readonly<SeverityExt[]>
const SIZES = ['medium', 'large'] as const

type ModalSeverity = Extract<SeverityExt, (typeof SEVERITIES)[number]>

type ModalSize = (typeof SIZES)[number]

type ModalPropsType = Omit<ModalProps, 'size'> & {
  form?: boolean
  size?: ModalSize
  header?: ReactNode
  actions?: ReactNode
  severity?: ModalSeverity
  lockBody?: boolean
  asForm?: boolean
  formProps?: StyledComponentPropsWithRef<'form'>
  [x: string]: unknown
}

const propTypes = {
  form: PropTypes.bool,
  size: PropTypes.oneOf(SIZES),
  header: PropTypes.node,
  actions: PropTypes.node,
  severity: PropTypes.oneOf(SEVERITIES),
  lockBody: PropTypes.bool,
} as const

const severityToIconColorKey = {
  default: 'icon-default',
  info: 'icon-info',
  danger: 'icon-danger',
  warning: 'icon-warning',
  success: 'icon-success',
} as const satisfies Readonly<Record<ModalSeverity | 'default', ColorKey>>

const severityToIcon = {
  default: null as null,
  info: InfoIcon,
  danger: ErrorIcon,
  warning: WarningIcon,
  success: CheckRoundedIcon,
} as const satisfies Record<
  ModalSeverity | 'default',
  ReturnType<typeof createIcon> | null | undefined
>

const sizeToWidth = {
  medium: 480,
  large: 608,
} as const satisfies Record<ModalSize, number>

const ModalSC = styled.div((_) => ({
  position: 'relative',
}))

const ModalContentSC = styled.div<{ $hasActions: boolean }>(
  ({ theme, $hasActions }) => ({
    margin: theme.spacing.large,
    marginBottom: $hasActions ? 0 : theme.spacing.large,
    ...theme.partials.text.body1,
  })
)

const ModalActionsSC = styled.div((_) => ({
  display: 'flex',
  position: 'sticky',
  flexDirection: 'column',
  bottom: '0',
}))

function ModalRef(
  {
    children,
    header,
    actions,
    open = false,
    form = false,
    size = form ? 'large' : 'medium',
    onClose,
    severity,
    lockBody = true,
    asForm = false,
    formProps = {},
    ...props
  }: ModalPropsType,
  ref: Ref<any>
) {
  const HeaderIcon = severityToIcon[severity ?? 'default']
  const iconColorKey = severityToIconColorKey[severity ?? 'default']

  const [, setBodyLocked] = useLockedBody(open && lockBody)

  useEffect(() => {
    setBodyLocked(lockBody && open)
  }, [lockBody, open, setBodyLocked])

  return (
    <HonorableModal
      open={open}
      onClose={onClose}
      ref={ref}
      fontSize={16}
      color="text"
      width={sizeToWidth[size]}
      maxWidth={sizeToWidth[size]}
      {...props}
    >
      <ModalSC
        as={asForm ? 'form' : undefined}
        {...(asForm ? formProps : {})}
      >
        <ModalContentSC $hasActions={!!actions}>
          {!!header && (
            <Flex
              ref={ref}
              align="center"
              justify="start"
              marginBottom="large"
              gap="xsmall"
            >
              {HeaderIcon && (
                <HeaderIcon
                  marginTop={-2} // optically center icon
                  color={iconColorKey}
                />
              )}
              <H1
                overline
                color="text-xlight"
              >
                {header}
              </H1>
            </Flex>
          )}
          {children}
        </ModalContentSC>
        {!!actions && (
          <ModalActionsSC>
            <Flex
              background="linear-gradient(180deg, transparent 0%, fill-one 100%);"
              height={16}
            />
            <Flex
              padding="large"
              align="center"
              justify="flex-end"
              backgroundColor="fill-one"
            >
              {actions}
            </Flex>
          </ModalActionsSC>
        )}
      </ModalSC>
    </HonorableModal>
  )
}

const Modal = forwardRef(ModalRef)

Modal.propTypes = propTypes

export default Modal
