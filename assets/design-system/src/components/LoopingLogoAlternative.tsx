import { type ComponentPropsWithRef } from 'react'
import styled from 'styled-components'

import PluralLogomarkBottomLeft from './icons/plural-animated/PluralLogomarkBottomLeft'
import PluralLogomarkBottomRight from './icons/plural-animated/PluralLogomarkBottomRight'
import PluralLogomarkDot from './icons/plural-animated/PluralLogomarkDot'
import PluralLogomarkTopLeft from './icons/plural-animated/PluralLogomarkTopLeft'
import PluralLogomarkTopRight from './icons/plural-animated/PluralLogomarkTopRight'
import { LoopingLogoWrapper } from './LoopingLogoWrapper'

export type LoopingLogoAlternativeProps = ComponentPropsWithRef<'div'> & {
  isDark?: boolean
  animated?: boolean
  scale?: number
}

export const scaling = (scale: number): { transform: string } =>
  scale ? { transform: `scale(${scale})` } : null

const GradientBackground = styled.div<{ $scale?: number }>`
  @keyframes rotateGradient {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  position: relative;
  width: ${({ $scale = 1 }) => (120 + 30 * 2) * $scale}px;
  height: ${({ $scale = 1 }) => (120 + 30 * 2) * $scale}px;
  border-radius: ${({ $scale = 1 }) => 42 * $scale}px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  padding: ${({ $scale = 1 }) => 30 * $scale}px;
  overflow: hidden;
  box-shadow:
    0 0 ${({ $scale = 1 }) => 40 * $scale}px rgba(96, 165, 250, 0.4),
    0 0 ${({ $scale = 1 }) => 80 * $scale}px rgba(139, 92, 246, 0.3),
    0 0 ${({ $scale = 1 }) => 120 * $scale}px rgba(251, 191, 36, 0.2);

  /* Rotating conic gradient background - fills entire container */
  &::before {
    content: '';
    position: absolute;
    /* Extend beyond container to cover corners during rotation (sqrt(2) * 1.2 for safety) */
    inset: ${({ $scale = 1 }) => -40 * $scale}px;
    border-radius: ${({ $scale = 1 }) => 42 * $scale}px;
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 1) 0%,
      /* Light blue - top left */ rgba(139, 92, 246, 1) 50%,
      /* Purple - top right */ rgba(251, 191, 36, 1) 100% /* Yellow - bottom */
    );
    animation: rotateGradient 8s linear infinite;
    z-index: 0;
  }

  /* Outer glow edge */
  &::after {
    content: '';
    position: absolute;
    inset: ${({ $scale = 1 }) => -2 * $scale}px;
    border-radius: ${({ $scale = 1 }) => 42 * $scale}px;
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 1) 0%,
      rgba(139, 92, 246, 1) 50%,
      rgba(251, 191, 36, 1) 100%
    );
    z-index: -1;
    filter: blur(${({ $scale = 1 }) => 8 * $scale}px);
    animation: rotateGradient 8s linear infinite;
  }
`

const LogoContainer = styled.div`
  position: relative;
  z-index: 1;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Override the LoopingLogoWrapper positioning to center the logo */
  .plrl-logomark-anim.anim01 .plrl-logomark-outer-wrapper {
    left: 0 !important;
    transform: none !important;
  }

  .plrl-logomark-anim.anim01
    .plrl-logomark-outer-wrapper
    .plrl-logomark-inner-wrapper {
    left: 0 !important;
    transform: none !important;
  }

  /* Disable all animations */
  * {
    animation: none !important;
    -webkit-animation: none !important;
    -moz-animation: none !important;
    -o-animation: none !important;
  }
`

const LogoWrapper = styled.div<{ $scale?: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ $scale = 1 }) => 36 * $scale}px;
`

const LoadingText = styled.div<{ $scale?: number }>`
  font-family: 'Monument Semi-Mono', 'Monument', 'Inter', 'Helvetica', 'Arial',
    sans-serif;
  font-size: ${({ $scale = 1 }) => 24 * $scale}px;
  font-weight: 400;
  white-space: nowrap;
  text-align: center;

  @keyframes textGradient {
    0% {
      background-position: 200% 50%;
    }
    100% {
      background-position: -200% 50%;
    }
  }

  background: linear-gradient(
    90deg,
    #f1f3f3 0%,
    #f1f3f3 25%,
    #505050 35%,
    #505050 65%,
    #f1f3f3 75%,
    #f1f3f3 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textGradient 8s linear infinite;
`

function LoopingLogoAlternative({
  ref,
  animated = false,
  scale,
  ...props
}: LoopingLogoAlternativeProps) {
  const color = '#ffffff' // Always white for contrast against gradient

  return (
    <LogoWrapper
      $scale={scale}
      {...props}
      ref={ref}
    >
      <GradientBackground $scale={scale}>
        <LogoContainer>
          <LoopingLogoWrapper>
            <div
              className={`plrl-logomark-anim anim01 ${!animated ? '' : 'looping'}`}
            >
              <div className="plrl-logomark-outer-wrapper">
                <div className="plrl-logomark-inner-wrapper">
                  <div className="plrl-logo-layer bottom-left">
                    <div className="plrl-logo-layer-mask">
                      <div className="plrl-logo-layer-mask-inner">
                        <PluralLogomarkBottomLeft color={color} />
                      </div>
                    </div>
                  </div>
                  <div className="plrl-logo-layer bottom-right">
                    <div className="plrl-logo-layer-mask">
                      <div className="plrl-logo-layer-mask-inner">
                        <PluralLogomarkBottomRight color={color} />
                      </div>
                    </div>
                  </div>
                  <div className="plrl-logo-layer top-left">
                    <div className="plrl-logo-layer-mask">
                      <div className="plrl-logo-layer-mask-inner">
                        <PluralLogomarkTopLeft color={color} />
                      </div>
                    </div>
                  </div>
                  <div className="plrl-logo-layer top-right">
                    <div className="plrl-logo-layer-mask">
                      <div className="plrl-logo-layer-mask-inner">
                        <PluralLogomarkTopRight color={color} />
                      </div>
                    </div>
                  </div>
                  <div className="plrl-logo-layer dot">
                    <div className="plrl-logo-layer-mask">
                      <div className="plrl-logo-layer-mask-inner">
                        <PluralLogomarkDot color={color} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </LoopingLogoWrapper>
        </LogoContainer>
      </GradientBackground>
      <LoadingText $scale={scale}>Loading console...</LoadingText>
    </LogoWrapper>
  )
}

export default LoopingLogoAlternative
