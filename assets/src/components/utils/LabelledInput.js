import { Box, Text, TextInput } from 'grommet'

export function LabelledInput({
  label, color, weight, value, onChange, placeholder, width, type, modifier,
}) {
  return (
    <Box
      gap="xxsmall"
      width={width || '300px'}
    >
      <Box
        direction="row"
        align="center"
      >
        <Box fill="horizontal">
          <Text
            size="small"
            weight={weight}
            color={color || 'dark-4'}
          >{label}
          </Text>
        </Box>
        <Box flex={false}>
          {modifier}
        </Box>
      </Box>
      <TextInput
        name={label}
        type={type}
        value={value || ''}
        onChange={onChange && (({ target: { value } }) => onChange(value))}
        placeholder={placeholder}
      />
    </Box>
  )
}
