import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Card, PageTitle } from '@pluralsh/design-system'
import { useContext, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'
import { Box, Text } from 'grommet'
import { Check } from 'forge-core'

import KubernetesCost from './KubernetesCost'

export default function CostAnalysis() {
  const { appName } = useParams()
  const { applications }: any = useContext(InstallationContext)
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const currentApp = applications.find(app => app.name === appName)
  const { cost, license } = currentApp

  useEffect(() => setBreadcrumbs([
    { text: 'Apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'Cost analysis', url: `/apps/${appName}/cost` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Cost analysis" />
      <Card
        paddingHorizontal={100}
        paddingVertical="large"
      >
        {cost && (
          <KubernetesCost
            cost={cost}
          />
        )}
        {license && <PluralCost license={license} />}
      </Card>
    </>
  )
}

function PluralCost({ license }) {
  const { status: plural } = license

  return (
    <Box
      pad="small"
      gap="small"
    >
      <Text
        size="small"
        weight={500}
      >Plural Cost
      </Text>
      <Text
        size="small"
        weight={500}
      >{plural.plan || 'Free'} Plan
      </Text>
      {plural.features && (
        <Box gap="xsmall">
          {plural.features.map(feature => (
            <PlanFeature
              key={feature.name}
              feature={feature}
            />
          ))}
        </Box>
      )}
      {plural.limits && <PlanLimits limits={license.limits} />}
    </Box>
  )
}

function PlanFeature({ feature: { name, description } }) {
  return (
    <Box
      direction="row"
      gap="small"
      align="center"
    >
      <Check
        size="small"
        color="brand"
      />
      <Box>
        <Text size="small">{name}</Text>
        <Text size="small"><i>{description}</i></Text>
      </Box>
    </Box>
  )
}

function PlanLimits({ limits }) {
  return (
    <Box
      gap="1px"
      border={{ side: 'between' }}
    >
      {Object.entries(limits).map(([name, val], i) => (
        <Box
          direction="row"
          align="center"
          gap="small"
          key={i}
        >
          <Text
            size="small"
            weight={500}
          >{name}
          </Text>
          <Text size="small">{val as any}</Text>
        </Box>
      ))}
    </Box>
  )
}
