import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { usePolicyConstraintQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  POLICIES_DETAILS_PATH,
  POLICIES_REL_PATH,
} from 'routes/policiesRoutesConsts'

function PolicyDetails() {
  const params = useParams()
  const { policyId } = params

  const { data } = usePolicyConstraintQuery({
    variables: {
      id: policyId || '',
    },
  })

  const policy = data?.policyConstraint

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
        { label: policy?.name || '' },
        { label: `${POLICIES_DETAILS_PATH}`, url: `/${POLICIES_REL_PATH}` },
      ],
      [policy?.name]
    )
  )

  return 'policy detail'
}

export default PolicyDetails
