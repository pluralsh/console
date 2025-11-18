import { type ComponentPropsWithRef } from 'react'
import { useTheme } from 'styled-components'

import PluralLogomarkBottomLeft from './icons/plural-animated/PluralLogomarkBottomLeft'
import PluralLogomarkBottomRight from './icons/plural-animated/PluralLogomarkBottomRight'
import PluralLogomarkDot from './icons/plural-animated/PluralLogomarkDot'
import PluralLogomarkTopLeft from './icons/plural-animated/PluralLogomarkTopLeft'
import PluralLogomarkTopRight from './icons/plural-animated/PluralLogomarkTopRight'
import { LoopingLogoWrapper } from './LoopingLogoWrapper'

export type LoopingLogoProps = ComponentPropsWithRef<'div'> & {
  isDark?: boolean
  animated?: boolean
  scale?: number
}

export const scaling = (scale: number): { transform: string } =>
  scale ? { transform: `scale(${scale})` } : null

function LoopingLogo({
  ref,
  animated = true,
  scale,
  ...props
}: LoopingLogoProps) {
  const theme = useTheme()
  const color = theme.colors['icon-light']

  return (
    <LoopingLogoWrapper
      ref={ref}
      {...props}
    >
      <div
        className={`plrl-logomark-anim anim01 ${!animated ? '' : 'looping'}`}
      >
        <div className="plrl-logomark-outer-wrapper">
          <div
            style={scaling(scale)}
            className="plrl-logomark-inner-wrapper"
          >
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
  )
}

export default LoopingLogo
