import { useEffect, useRef, useState } from 'react'
import { FormField as GrommetFormField, Text } from 'grommet'
import styled from 'styled-components'
import PropTypes from 'prop-types'

const Wrapper = styled.div`
  position: relative;
`

const Caption = styled(Text)`
  position: absolute;
  top: 8px;
  right: 0;
`

export default function FormField({ label, caption, style, className, valid, error, ...props }) {
  const labelRef = useRef()
  const [captionMaxWidth, setCaptionMaxWidth] = useState('auto')

  useEffect(() => {
    const { width } = labelRef.current.getBoundingClientRect()

    setCaptionMaxWidth(`calc(100% - ${width + 8}px)`)
  }, [])

  return (
    <Wrapper {...{ style, className }}>
      <Caption
        truncate
        color={error ? 'status-critical' : valid ? 'brand' : 'text-weak'}
        size="small"
        style={{ maxWidth: captionMaxWidth }}
      >
        {caption}
      </Caption>
      <GrommetFormField
        label={(
          <Text
            ref={labelRef}
            weight="bold"
          >
            {label}
          </Text>
        )}
        {...props}
      />
    </Wrapper>
  )
}

FormField.propTypes = {
  label: PropTypes.string,
  caption: PropTypes.string,
  valid: PropTypes.bool,
  error: PropTypes.bool,
}

FormField.defaultProps = {
  label: '',
  caption: '',
  valid: false,
  error: false,
}
