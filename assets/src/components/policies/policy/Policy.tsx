import {
  TreeNav,
  TreeNavEntry,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { usePolicyConstraintQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  POLICIES_AFFECTED_RESOURCES_PATH,
  POLICIES_DETAILS_PATH,
  POLICIES_REL_PATH,
} from 'routes/policiesRoutesConsts'

import { ResponsiveLayoutSidenavContainer } from '../../utils/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutPage } from '../../utils/layout/ResponsiveLayoutPage'

import PolicyDetails from './details/PolicyDetails'
import PolicyAffectedResources from './affectedResources/PolicyAffectedResources'

function Policy() {
  const params = useParams()
  const navigate = useNavigate()

  const { policyId } = params

  const route = params['*']
  const { data, loading } = usePolicyConstraintQuery({
    variables: {
      id: policyId || '',
    },
  })

  const isDetailsPath = route?.includes(POLICIES_DETAILS_PATH)

  const policy = data?.policyConstraint

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
        { label: policy?.name || '' },
        {
          label: isDetailsPath
            ? POLICIES_DETAILS_PATH
            : POLICIES_AFFECTED_RESOURCES_PATH,
          url: `/${
            isDetailsPath
              ? POLICIES_DETAILS_PATH
              : POLICIES_AFFECTED_RESOURCES_PATH
          }`,
        },
      ],
      [policy?.name, isDetailsPath]
    )
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer paddingTop={57}>
        <TreeNav>
          <TreeNavEntry
            key={POLICIES_DETAILS_PATH}
            label="Details"
            onClick={() => {
              if (!route?.includes(POLICIES_DETAILS_PATH)) {
                navigate(
                  `/${POLICIES_REL_PATH}/${policyId}/${POLICIES_DETAILS_PATH}`
                )
              }
            }}
            active={route?.includes(POLICIES_DETAILS_PATH)}
          />
          <TreeNavEntry
            key={POLICIES_AFFECTED_RESOURCES_PATH}
            label="Affected Resources"
            onClick={() => {
              if (!route?.includes(POLICIES_AFFECTED_RESOURCES_PATH)) {
                navigate(
                  `/${POLICIES_REL_PATH}/${policyId}/${POLICIES_AFFECTED_RESOURCES_PATH}`
                )
              }
            }}
            active={route?.includes(POLICIES_AFFECTED_RESOURCES_PATH)}
          />
        </TreeNav>
      </ResponsiveLayoutSidenavContainer>
      {isDetailsPath ? (
        <PolicyDetails policy={policy} />
      ) : (
        <PolicyAffectedResources
          policyName={policy?.name}
          violations={policy?.violations}
          loading={loading}
        />
      )}
    </ResponsiveLayoutPage>
  )
}

export default Policy
