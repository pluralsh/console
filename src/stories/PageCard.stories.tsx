import { A, Flex } from 'honorable'

import CheckedShieldIcon from '../components/icons/CheckedShieldIcon'

import { PageCard } from '../index'

export default {
  title: 'Page Card',
  component: PageCard,
}

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
        subheading={(
          <>
            Admin at{' '}
            <A
              href="#"
              inline
            >
              Plural
            </A>
          </>
        )}
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

export const Default = Template.bind({})
Default.args = {}
