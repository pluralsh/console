import { Divider } from '@pluralsh/design-system'

import styled from 'styled-components'

export default styled(props => <div {...props}><Divider /></div>)(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
  marginBottom: theme.spacing.xlarge,
}))
