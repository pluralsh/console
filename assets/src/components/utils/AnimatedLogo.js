import { Box } from 'grommet'
import './logo-animation.css'

const BOTTOM_LEFT = `${process.env.PUBLIC_URL}/plural-logomark-mechanical-for-animation-{color}_bottom-left_100px.svg`
const BOTTOM_RIGHT = `${process.env.PUBLIC_URL}/plural-logomark-mechanical-for-animation-{color}_bottom-right_100px.svg`
const TOP_LEFT = `${process.env.PUBLIC_URL}/plural-logomark-mechanical-for-animation-{color}_top-left_100px.svg`
const TOP_RIGHT = `${process.env.PUBLIC_URL}/plural-logomark-mechanical-for-animation-{color}_top-right_100px.svg`
const DOT = `${process.env.PUBLIC_URL}/plural-logomark-mechanical-for-animation-{color}_dot_100px.svg`

function scaling(scale) {
  if (!scale) return null

  return { transform: `scale(${scale})` }
}

const image = (img, dark) => img.replace('{color}', dark ? 'wht' : 'blk') 

export function LoopingLogo({ nofill, height, scale, dark, still }) {
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
