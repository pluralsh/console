import styled from 'styled-components'

import { Divider } from '../../index'

export default styled((props) => (
  <div {...props}>
    <Divider />
  </div>
))(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
  marginBottom: theme.spacing.xlarge,
}))
