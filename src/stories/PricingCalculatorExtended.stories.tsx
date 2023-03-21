import PricingCalculatorExtended from '../components/pricingcalculator/PricingCalculatorExtended'

export default {
  title: 'Pricing Calculator Extended',
  component: PricingCalculatorExtended,
}

function Template(args: any) {
  return (
    <PricingCalculatorExtended
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  appsDefault: 5,
  clustersDefault: 1,
  usersDefault: 0,
  professionalDefualt: false,
  fillLevel: 2,
}
