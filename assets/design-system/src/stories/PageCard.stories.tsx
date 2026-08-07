import { A, Flex } from 'honorable'

import CheckedShieldIcon from '../components/icons/CheckedShieldIcon'

import { PageCard } from '../index'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Page Card',
  component: PageCard,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template() {
  return (
    <Flex
      flexWrap="wrap"
      gap="xlarge"
      flexDirection="column"
      maxWidth="240px"
    >
      <PageCard
        heading="Airbyte"
        subheading="Verified"
        subheadingIcon={<CheckedShieldIcon />}
        icon={{
          url: '/logos/airbyte-logo.svg',
        }}
      />
      <PageCard
        heading="Michael Guarino"
        subheading={
          <>
            Admin at{' '}
            <A
              href="#"
              inline
            >
              Plural
            </A>
          </>
        }
        icon={{
          url: 'photo.png',
          spacing: 'none',
        }}
      />
      <PageCard
        icon={{
          url: '/logos/plural-logomark-only-white.svg',
        }}
        heading="plrlDemo1"
        subheading="GCP"
      />
      <PageCard
        icon={{
          name: 'Jimmy J Unknown',
        }}
        heading="Jimmy J Unknown"
      />

      <PageCard
        heading="airflow-identity"
        icon={{
          url: '/logos/airflow-logo.svg',
        }}
      >
        Optional child content lorem ipsum dolor sit amet
      </PageCard>
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {},
}

