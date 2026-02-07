import { LoopingLogo } from '@pluralsh/design-system'
import { ComponentPropsWithRef, useId } from 'react'
import styled, { useTheme } from 'styled-components'

export const LoadingIndicatorWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing.xlarge,
}))

export default function LoadingIndicator(
  props: ComponentPropsWithRef<typeof LoadingIndicatorWrap>
) {
  return (
    <LoadingIndicatorWrap {...props}>
      <LoopingLogo />
    </LoadingIndicatorWrap>
  )
}

export function LoadingIndicatorAlt(
  props: ComponentPropsWithRef<typeof LoadingIndicatorWrap>
) {
  return (
    <LoadingIndicatorWrap {...props}>
      <PluralLogoSkeleton />
    </LoadingIndicatorWrap>
  )
}

function PluralLogoSkeleton({ size = 96 }: { size?: number }) {
  const theme = useTheme()
  const gradientId = useId()

  return (
    <PluralLogoShimmerSvgSC
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.95559 11.0085C9.61728 11.0085 10.9643 9.66143 10.9643 7.99973C10.9643 6.33804 9.61728 4.99097 7.95559 4.99097C6.2939 4.99097 4.94684 6.33804 4.94684 7.99973C4.94684 9.66143 6.2939 11.0085 7.95559 11.0085Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M5.01398 15.9995V13.5319H12.9776C13.2573 13.5319 13.4843 13.3024 13.4843 13.0197V0H16V14.9793C16 16 14.9243 16 14.9243 16H5.01398V15.9995Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M10.9855 0V2.46753H3.0225C2.7428 2.46753 2.51574 2.69703 2.51574 2.97974V15.9995H0V1.02066C0 -1.02515e-07 1.07574 0 1.07574 0H10.9855Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="8"
          x2="16"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={theme.colors['fill-zero']}
          />
          <stop
            offset="50%"
            stopColor={theme.colors['fill-one']}
          />
          <stop
            offset="100%"
            stopColor={theme.colors['fill-two']}
          />
        </linearGradient>
      </defs>
    </PluralLogoShimmerSvgSC>
  )
}

const PluralLogoShimmerSvgSC = styled.svg(({ theme }) => ({
  '@keyframes shimmer-plural-logo': {
    '0%': { stopColor: theme.colors['fill-one'] },
    '25%': { stopColor: theme.colors['fill-two'] },
    '50%': { stopColor: theme.colors['fill-three'] },
    '75%': { stopColor: theme.colors['fill-two'] },
    '100%': { stopColor: theme.colors['fill-one'] },
  },
  display: 'block',
  '& stop': {
    animation: 'shimmer-plural-logo 3.6s linear infinite',
  },
}))
