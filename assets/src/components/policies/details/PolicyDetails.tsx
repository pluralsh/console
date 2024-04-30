import { useParams } from 'react-router-dom'

function PolicyDetails() {
  const params = useParams()
  const { policyId } = params

  console.log('policyId:', policyId)

  return 'policy detail'
}

export default PolicyDetails
