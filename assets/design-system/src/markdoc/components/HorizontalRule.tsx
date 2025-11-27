import styled from 'styled-components'

import { type ComponentProps } from 'react'

import { Divider } from '../../index'

export default styled((props: ComponentProps<'div'>) => (
  <div {...props}>
    <Divider />
  </div>
))(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
  marginBottom: theme.spacing.xlarge,
}))
