import { Radio as HonorableRadio } from 'honorable'

function Radio(props: object) {
  return (
    <HonorableRadio
      iconChecked={(
        <svg
          width="74%" // Not 75% to fix alignment in flex
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="16"
            height="16"
            rx="8"
            fill="currentColor"
          />
        </svg>
      )}
      iconUnchecked={null}
      {...props}
    />
  )
}

export default Radio
