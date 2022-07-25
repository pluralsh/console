import { ReactNode, Ref, forwardRef } from 'react'
import { Select as HonorableSelect, SelectProps as HonorableSelectProps, MenuItem } from 'honorable'
import PropTypes from 'prop-types'

type SelectProps = HonorableSelectProps & {
  items: Array<{ label: ReactNode, value: any }>
}

const propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.node.isRequired,
    value: PropTypes.any.isRequired, // eslint-disable-line
  }).isRequired).isRequired,
}

function SelectRef({ items, ...props }: SelectProps, ref: Ref<any>) {
  return (
    <HonorableSelect
      ref={ref}
      {...props}
    >
      {items.map(({ value, label }) => (
        <MenuItem key={value}>
          {label}
        </MenuItem>
      ))}
    </HonorableSelect>
  )
}

const Select = forwardRef(SelectRef)

// @ts-ignore
Select.propTypes = propTypes

export default Select
