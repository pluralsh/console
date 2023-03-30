import PricingCalculator from '../components/pricingcalculator/PricingCalculator'

export default {
  title: 'Pricing Calculator',
  component: PricingCalculator,
}

function Template(args: any) {
  return <PricingCalculator {...args} />
}

export const Default = Template.bind({})

Default.args = {
  appsDefault: 15,
  expandedDefault: true,
}
