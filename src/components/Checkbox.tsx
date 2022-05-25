import { Checkbox as HonorableCheckbox } from 'honorable'

function Checkbox(props: object) {
  return (
    <HonorableCheckbox
      icon={(
        <svg
          width="50%"
          viewBox="0 0 11 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 1L4 7L1 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {...props}
    />
  )
}

export default Checkbox
