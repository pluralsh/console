import { Flex, IconFrame, Input2, ReloadIcon } from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { generateRandomAlphanumeric } from 'utils/generateRandomAlphanumeric'
import { ChangeEvent, ComponentProps, useCallback } from 'react'

type SecretInputWithGenerateProps = {
  value: string
  onChange: ComponentProps<typeof Input2>['onChange']
  masked?: boolean
  defaultRevealed?: boolean
} & Omit<ComponentProps<typeof Input2>, 'value' | 'onChange'>

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
      <Flex
        flex={1}
        minWidth={0}
      >
        {masked ? (
          <InputRevealer
            defaultRevealed={defaultRevealed}
            value={value}
            onChange={onChange}
            {...props}
          />
        ) : (
          <Input2
            value={value}
            onChange={onChange}
            {...props}
          />
        )}
      </Flex>
      <IconFrame
        clickable
        type="secondary"
        tooltip="Generate secret"
        icon={<ReloadIcon />}
        onClick={handleGenerate}
      />
    </Flex>
  )
}
