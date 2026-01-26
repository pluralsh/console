import { type ComponentPropsWithRef } from 'react'
import { useTheme } from 'styled-components'
import styled from 'styled-components'

export type LoopingLogoOutlineAlternativeProps = ComponentPropsWithRef<'div'> & {
  isDark?: boolean
  scale?: number
}

const LogoContainer = styled.div<{ $scale?: number }>`
  position: relative;
  width: ${({ $scale = 1 }) => 195 * $scale}px;
  height: ${({ $scale = 1 }) => 195 * $scale}px;
  margin: 0 auto;
`

const StyledSVG = styled.svg<{ $scale?: number }>`
  width: ${({ $scale = 1 }) => 195 * $scale}px;
  height: ${({ $scale = 1 }) => 195 * $scale}px;
`

// Static base paths - unfilled state (always visible)
const BasePath = styled.path`
  fill: #2A2E37;
  stroke: none;
`

const BaseCircle = styled.circle`
  fill: #2A2E37;
  stroke: none;
`

// Animated fill paths - fill from bottom to top
const FillPath = styled.path<{ $totalDuration: number }>`
  fill: #F1F3F3;
  stroke: none;
  clip-path: inset(100% 0 0 0);
  animation: fillUp ${({ $totalDuration }) => $totalDuration}s linear infinite;
  
  @keyframes fillUp {
    0% {
      clip-path: inset(100% 0 0 0);
    }
    66.67% {
      clip-path: inset(0% 0 0 0);
    }
    83.33% {
      clip-path: inset(0% 0 0 0);
    }
    83.34% {
      clip-path: inset(100% 0 0 0);
    }
    100% {
      clip-path: inset(100% 0 0 0);
    }
  }
`

const FillCircle = styled.circle<{ $totalDuration: number }>`
  fill: #F1F3F3;
  stroke: none;
  clip-path: inset(100% 0 0 0);
  animation: fillUp ${({ $totalDuration }) => $totalDuration}s linear infinite;
`

const LogoWrapper = styled.div<{ $scale?: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ $scale = 1 }) => 36 * $scale}px;
`

const LoadingText = styled.div<{ $scale?: number }>`
  font-family: "Monument Semi-Mono", "Monument", "Inter", "Helvetica", "Arial", sans-serif;
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
    #F1F3F3 0%,
    #F1F3F3 25%,
    #505050 35%,
    #505050 65%,
    #F1F3F3 75%,
    #F1F3F3 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: textGradient 8s linear infinite;
`

function LoopingLogoOutlineAlternative({
  ref,
  scale = 1,
  ...props
}: LoopingLogoOutlineAlternativeProps) {
  // Total animation duration per cycle (in seconds)
  // 10s fill + 2.5s hold + 2.5s empty = 15s total
  const totalDuration = 15

  return (
    <LogoWrapper $scale={scale} {...props} ref={ref}>
      <LogoContainer $scale={scale}>
        <StyledSVG
          $scale={scale}
          viewBox="0 0 195 195"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circle - Base (unfilled, static) */}
          <BaseCircle
            cx="96.9587"
            cy="97.4965"
            r="36.6695"
          />
          
          {/* Circle - Fill (animated) */}
          <FillCircle
            $totalDuration={totalDuration}
            cx="96.9587"
            cy="97.4965"
            r="36.6695"
          />
          
          {/* Right Path - Base (unfilled, static) */}
          <BasePath
            d="M61.1074 194.993V164.92H158.163C161.572 164.92 164.34 162.123 164.34 158.678V0H195V182.561C195 195 181.89 195 181.89 195H61.1074V194.993Z"
          />
          
          {/* Right Path - Fill (animated) */}
          <FillPath
            $totalDuration={totalDuration}
            d="M61.1074 194.993V164.92H158.163C161.572 164.92 164.34 162.123 164.34 158.678V0H195V182.561C195 195 181.89 195 181.89 195H61.1074V194.993Z"
          />
          
          {/* Left Path - Base (unfilled, static) */}
          <BasePath
            d="M133.886 0V30.0731H36.8367C33.4278 30.0731 30.6605 32.8701 30.6605 36.3156V194.993H0V12.4393C0 -1.2494e-06 13.1106 0 13.1106 0H133.886V0Z"
          />
          
          {/* Left Path - Fill (animated) */}
          <FillPath
            $totalDuration={totalDuration}
            d="M133.886 0V30.0731H36.8367C33.4278 30.0731 30.6605 32.8701 30.6605 36.3156V194.993H0V12.4393C0 -1.2494e-06 13.1106 0 13.1106 0H133.886V0Z"
          />
        </StyledSVG>
      </LogoContainer>
      <LoadingText $scale={scale}>Loading console...</LoadingText>
    </LogoWrapper>
  )
}

export default LoopingLogoOutlineAlternative
