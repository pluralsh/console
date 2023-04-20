import { Tag } from '@markdoc/markdoc'

import PricingCalculatorExtended from '../../components/pricingcalculator/PricingCalculatorExtended'

export const calculator = {
  render: PricingCalculatorExtended,
  description: 'Display extended version of pricing calculator',
  transform() {
    return new Tag(this.render as any)
  },
}
