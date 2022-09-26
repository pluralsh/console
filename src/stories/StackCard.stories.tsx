import { Flex } from 'honorable'

import StackCard from '../components/StackCard'

export default {
  title: 'StackCard',
  component: StackCard,
}

function Template(args: any) {
  return (
    <Flex
      direction="row"
      gap="xlarge"
      wrap="wrap"
    >
      <StackCard
        title="DevOps"
        description="Everything you need to lay the foundation of your open-source environment."
        hue="blue"
        {...args}
      />
      <StackCard
        title="Data"
        description="Take a deeper look at your data with this robust Data Stack."
        hue="green"
        {...args}
      />
      <StackCard
        title="Security"
        description="Make sure your infrastructure is secure from the ground up - right here!"
        hue="yellow"
        {...args}
      />
      <StackCard
        title="Gaming"
        description="Gaming Stack is a collection of popular game servers."
        hue="red"
        {...args}
      />
      <StackCard
        title="Single App"
        hue="blue"
        {...args}
        apps={[{ name: 'Console', imageUrl: '/logos/console-logo.png' }]}
      />
      <StackCard
        title="Empty"
        {...args}
        apps={null}
      />
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  apps: [
    { name: 'Airflow', imageUrl: '/logos/airflow-logo.svg' },
    { name: 'Airbyte', imageUrl: '/logos/airbyte-logo.svg' },
    { name: 'Console', imageUrl: '/logos/console-logo.png' },
    { name: 'Crossplane', imageUrl: '/logos/crossplane-logo.png' },
  ],
  width: '420px',
}

