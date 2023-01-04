import { Box } from 'grommet'
import { HeightType } from 'grommet/utils'
import './logo-animation.css'

const BOTTOM_LEFT
  = '/plural-logomark-mechanical-for-animation-{color}_bottom-left_100px.svg'
const BOTTOM_RIGHT
  = '/plural-logomark-mechanical-for-animation-{color}_bottom-right_100px.svg'
const TOP_LEFT
  = '/plural-logomark-mechanical-for-animation-{color}_top-left_100px.svg'
const TOP_RIGHT
  = '/plural-logomark-mechanical-for-animation-{color}_top-right_100px.svg'
const DOT = '/plural-logomark-mechanical-for-animation-{color}_dot_100px.svg'

function scaling(scale) {
  return !scale ? {} : { transform: `scale(${scale})` }
}

const image = (img: string, dark = false) => img.replace('{color}', dark ? 'wht' : 'blk')

export type LoopingLogoProps = {
  nofill?: boolean;
  height?: HeightType;
  scale?: number;
  dark?: boolean;
  still?: boolean;
}
;export function LoopingLogo({
  nofill = false,
  height,
  scale,
  dark = false,
  still = false,
}: LoopingLogoProps) {
  return (
    <Box
      background={dark ? 'backgroundColor' : 'plrl-white'}
      fill={!nofill}
      height={height}
      align="center"
      justify="center"
    >
      <div className={`plrl-logomark-anim anim01 ${still ? '' : 'looping'}`}>
        <div className="plrl-logomark-outer-wrapper">
          <div
            style={scaling(scale)}
            className="plrl-logomark-inner-wrapper"
          >
            <div className="plrl-logo-layer bottom-left">
              <div className="plrl-logo-layer-mask">
                <div className="plrl-logo-layer-mask-inner">
                  <img
                    src={image(BOTTOM_LEFT, dark)}
                    alt=""
                  />
                </div>
              </div>
            </div>
            <div className="plrl-logo-layer bottom-right">
              <div className="plrl-logo-layer-mask">
                <div className="plrl-logo-layer-mask-inner">
                  <img
                    src={image(BOTTOM_RIGHT, dark)}
                    alt=""
                  />
                </div>
              </div>
            </div>
            <div className="plrl-logo-layer top-left">
              <div className="plrl-logo-layer-mask">
                <div className="plrl-logo-layer-mask-inner">
                  <img
                    src={image(TOP_LEFT, dark)}
                    alt=""
                  />
                </div>
              </div>
            </div>
            <div className="plrl-logo-layer top-right">
              <div className="plrl-logo-layer-mask">
                <div className="plrl-logo-layer-mask-inner">
                  <img
                    src={image(TOP_RIGHT, dark)}
                    alt=""
                  />
                </div>
              </div>
            </div>
            <div className="plrl-logo-layer dot">
              <div className="plrl-logo-layer-mask">
                <div className="plrl-logo-layer-mask-inner">
                  <img
                    src={image(DOT, dark)}
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Box>
  )
}
