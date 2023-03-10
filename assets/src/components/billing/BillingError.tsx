import styled from 'styled-components'

const Wrapper = styled.div({ textAlign: 'center' })

export default function BillingError() {
  return <Wrapper>An error occured, please reload the page or contact support.</Wrapper>
}
