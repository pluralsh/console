import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { FormField as GrommetFormField, Text } from 'grommet'
import styled from 'styled-components'
import PropTypes from 'prop-types'

type FormFieldProps = PropsWithChildren<{
  label?: string
  caption?: string
  valid?: boolean
  error?: boolean
}>

const propTypes = {
  children: PropTypes.node,
  label: PropTypes.string,
  caption: PropTypes.string,
  valid: PropTypes.bool,
  error: PropTypes.bool,
}

const Wrapper = styled.div`
  position: relative;
`

const Caption = styled(Text)`
  position: absolute;
  top: 8px;
  right: 0;
`

function FormField({ children, label = '', caption = '', valid = false, error = false, ...props }: FormFieldProps) {
  const labelRef = useRef()
  const [captionMaxWidth, setCaptionMaxWidth] = useState('auto')

  useEffect(() => {
    const { width } = (labelRef.current as any).getBoundingClientRect()

    setCaptionMaxWidth(`calc(100% - ${width + 8}px)`)
  }, [])

  return (
    <Wrapper {...props}>
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
      >
        {children}
      </GrommetFormField>
    </Wrapper>
  )
}

FormField.propTypes = propTypes

export default FormField
