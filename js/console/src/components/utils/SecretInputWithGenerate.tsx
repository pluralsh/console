import { Flex, IconFrame, Input, ReloadIcon } from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { generateRandomAlphanumeric } from 'utils/generateRandomAlphanumeric'
import { ChangeEvent, ComponentProps, useCallback } from 'react'

type SecretInputWithGenerateProps = {
  value: string
  onChange: ComponentProps<typeof Input>['onChange']
  masked?: boolean
  defaultRevealed?: boolean
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange'>

const inputGrowStyles = { flex: 1, minWidth: 0, width: '100%' } as const

export function SecretInputWithGenerate({
  value,
  onChange,
  masked = false,
  defaultRevealed = false,
  ...props
}: SecretInputWithGenerateProps) {
  const handleGenerate = useCallback(() => {
    onChange?.({
      target: { value: generateRandomAlphanumeric() },
    } as ChangeEvent<HTMLInputElement>)
  }, [onChange])

  return (
    <Flex
      align="center"
      gap="xsmall"
      width="100%"
    >
      {masked ? (
        <InputRevealer
          defaultRevealed={defaultRevealed}
          value={value}
          onChange={onChange}
          css={inputGrowStyles}
          {...props}
        />
      ) : (
        <Input
          value={value}
          onChange={onChange}
          css={inputGrowStyles}
          {...props}
        />
      )}
      <IconFrame
        clickable
        type="secondary"
        tooltip="Generate secret"
        icon={<ReloadIcon />}
        onClick={handleGenerate}
        css={{ flexShrink: 0 }}
      />
    </Flex>
  )
}
