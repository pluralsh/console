import { type ReactNode, type Ref, forwardRef, useEffect } from 'react'
import {
  Div,
  Flex,
  H1,
  Modal as HonorableModal,
  type ModalProps,
} from 'honorable'
import PropTypes from 'prop-types'

import { type ColorKey, type Severity } from '../types'

import useLockedBody from '../hooks/useLockedBody'

import CheckRoundedIcon from './icons/CheckRoundedIcon'
import type createIcon from './icons/createIcon'
import ErrorIcon from './icons/ErrorIcon'
import WarningIcon from './icons/WarningIcon'
import InfoIcon from './icons/InfoIcon'

export const SEVERITIES = ['info', 'warning', 'success', 'danger'] as const
const SIZES = ['medium', 'large'] as const

type ModalSeverity = Extract<Severity, (typeof SEVERITIES)[number]>

type ModalSize = (typeof SIZES)[number]

type ModalPropsType = Omit<ModalProps, 'size'> & {
  form?: boolean
  size?: ModalSize
  header?: ReactNode
  actions?: ReactNode
  severity?: ModalSeverity
  lockBody?: boolean
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

function ModalRef(
  {
    children,
    header,
    actions,
    form = false,
    open = false,
    size = form ? 'large' : 'medium',
    onClose,
    severity,
    lockBody = true,
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
      <Div
        margin="large"
        marginBottom={actions ? 0 : 'large'}
        body1
      >
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
      </Div>
      {!!actions && (
        <Flex
          position="sticky"
          direction="column"
          bottom="0"
        >
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
        </Flex>
      )}
    </HonorableModal>
  )
}

const Modal = forwardRef(ModalRef)

Modal.propTypes = propTypes

export default Modal
