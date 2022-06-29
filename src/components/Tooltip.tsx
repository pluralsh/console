import { Ref, forwardRef } from 'react'
import { Tooltip as TooltipBase, TooltipProps as TooltipBaseProps } from 'honorable'

function TooltipRef(props: TooltipBaseProps, ref:Ref<any>) {

  const styles = {
    'Tooltip.Arrow': { backgroundColor: 'blue' },
  }

  return (
    <TooltipBase
      ref={ref}
      arrow
      arrowSize={8}
      placement="right"
      label="Yeah right buddy this is so much text y'know"
      caption
      zIndex={1}
      {...props}
      {...styles}
    />
  )
}

const Tooltip = forwardRef(TooltipRef)
export default Tooltip
export type TooltipProps = TooltipBaseProps
