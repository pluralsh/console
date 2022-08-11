import { ComponentPropsWithRef, HTMLAttributes, forwardRef } from 'react'

import PluralLogomarkBottomLeft from './icons/plural-animated/PluralLogomarkBottomLeft'
import PluralLogomarkBottomRight from './icons/plural-animated/PluralLogomarkBottomRight'
import PluralLogomarkDot from './icons/plural-animated/PluralLogomarkDot'
import PluralLogomarkTopLeft from './icons/plural-animated/PluralLogomarkTopLeft'
import PluralLogomarkTopRight from './icons/plural-animated/PluralLogomarkTopRight'
import { LoopingLogoWrapper } from './LoopingLogoWrapper'

export type LoopingLogoProps = ComponentPropsWithRef<'div'> & {
  isDark?: boolean
  animated?: boolean
  scale?: number;
}

const scaling = (scale: number): { transform: string } => (scale ? { transform: `scale(${scale})` } : null)

const LoopingLogo = forwardRef<HTMLDivElement, LoopingLogoProps & HTMLAttributes<HTMLDivElement>>(({
  isDark = false,
  animated = true,
  scale,
  ...props
},
ref): JSX.Element => (
  <LoopingLogoWrapper
    ref={ref}
    {...props}
  >
    <div className={`plrl-logomark-anim anim01 ${!animated ? '' : 'looping'}`}>
      <div className="plrl-logomark-outer-wrapper">
        <div
          style={scaling(scale)}
          className="plrl-logomark-inner-wrapper"
        >
          <div className="plrl-logo-layer bottom-left">
            <div className="plrl-logo-layer-mask">
              <div className="plrl-logo-layer-mask-inner">
                <PluralLogomarkBottomLeft color={isDark ? '#000' : '#FFF'} />
              </div>
            </div>
          </div>
          <div className="plrl-logo-layer bottom-right">
            <div className="plrl-logo-layer-mask">
              <div className="plrl-logo-layer-mask-inner">
                <PluralLogomarkBottomRight color={isDark ? '#000' : '#FFF'} />
              </div>
            </div>
          </div>
          <div className="plrl-logo-layer top-left">
            <div className="plrl-logo-layer-mask">
              <div className="plrl-logo-layer-mask-inner">
                <PluralLogomarkTopLeft color={isDark ? '#000' : '#FFF'} />
              </div>
            </div>
          </div>
          <div className="plrl-logo-layer top-right">
            <div className="plrl-logo-layer-mask">
              <div className="plrl-logo-layer-mask-inner">
                <PluralLogomarkTopRight color={isDark ? '#000' : '#FFF'} />
              </div>
            </div>
          </div>
          <div className="plrl-logo-layer dot">
            <div className="plrl-logo-layer-mask">
              <div className="plrl-logo-layer-mask-inner">
                <PluralLogomarkDot color={isDark ? '#000' : '#FFF'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </LoopingLogoWrapper>
))

export default LoopingLogo
