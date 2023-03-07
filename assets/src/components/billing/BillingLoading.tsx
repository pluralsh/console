import { Spinner } from 'honorable'
import styled from 'styled-components'

const Wrapper = styled.div({
  display: 'flex',
  justifyContent: 'center',
})

export default function BillingLoading() {
  return <Wrapper><Spinner /></Wrapper>
}
