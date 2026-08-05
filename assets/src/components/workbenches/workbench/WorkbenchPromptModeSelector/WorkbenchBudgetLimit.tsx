import { Flex, MinusIcon, PlusIcon, Switch } from '@pluralsh/design-system'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import type { WorkbenchJobBudgetAttributes } from 'generated/graphql'
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { formatTokenCount } from '../../common/workbenchUsage'
import { WorkbenchBudgetSpendCapWarning } from './WorkbenchBudgetSpendCapWarning'
import { TOKEN_LIMIT_HINT, TOKEN_LIMIT_LABEL } from './workbenchPromptModes'

type BudgetUnit = 'dollars' | 'tokens'

const TOKEN_THOUSAND = 1_000
const TOKEN_HUNDRED_THOUSAND = 100_000
const TOKEN_MILLION = 1_000_000
const DOLLAR_DIME = 0.1
const DOLLAR_INCREMENT = 1
const MAX_DOLLAR_LIMIT = 1_000_000
const HOLD_REPEAT_DELAY_MS = 400
const HOLD_REPEAT_INTERVAL_MS = 100

/**
 * Rounding / step unit scales with magnitude so each +/- click changes the
 * compact label (e.g. 1.2B steps by 0.1B, not 10M which would look like a no-op).
 */
const tokenStepSize = (amount: number) => {
  if (amount < TOKEN_MILLION) return TOKEN_HUNDRED_THOUSAND

  // Match formatTokenCount compact notation (1 fraction digit).
  return 10 ** (Math.floor(Math.log10(amount)) - 1)
}

/** Whole dollars at/above $1; dimes below $1. */
const dollarStepSize = (amount: number) =>
  amount > 0 && amount < 1 ? DOLLAR_DIME : DOLLAR_INCREMENT

export function WorkbenchBudgetLimitControl({
  workbenchId,
  value,
  onChange,
  disabled = false,
}: {
  workbenchId?: Nullable<string>
  value: WorkbenchJobBudgetAttributes | null | undefined
  onChange: (value: WorkbenchJobBudgetAttributes | undefined) => void
  disabled?: boolean
}) {
  const enabled = value?.tokens != null || value?.cost != null
  const [preferredUnit, setPreferredUnit] = useState<BudgetUnit>(
    value?.cost != null ? 'dollars' : 'tokens'
  )

  return (
    <Flex
      direction="column"
      gap="medium"
      css={{ marginTop: 'auto' }}
    >
      <Flex
        align="center"
        gap="small"
      >
        <Switch
          aria-label="Set token limit"
          checked={enabled}
          disabled={disabled}
          onChange={(checked) =>
            onChange(checked ? defaultBudget(preferredUnit) : undefined)
          }
        />
        <Body2BoldP>{TOKEN_LIMIT_LABEL}</Body2BoldP>
        <CaptionP $color="text-xlight">{TOKEN_LIMIT_HINT}</CaptionP>
      </Flex>
      {enabled && (
        <>
          <WorkbenchBudgetAmountControl
            value={value}
            onChange={onChange}
            disabled={disabled}
            onUnitChange={setPreferredUnit}
          />
          <WorkbenchBudgetSpendCapWarning
            workbenchId={workbenchId}
            budget={value}
          />
        </>
      )}
    </Flex>
  )
}

export function WorkbenchBudgetAmountControl({
  value,
  onChange,
  disabled = false,
  stacked = false,
  onUnitChange,
}: {
  value: WorkbenchJobBudgetAttributes | null | undefined
  onChange: (value: WorkbenchJobBudgetAttributes) => void
  disabled?: boolean
  stacked?: boolean
  onUnitChange?: (unit: BudgetUnit) => void
}) {
  const [preferredUnit, setPreferredUnit] = useState<BudgetUnit>(
    value?.cost != null ? 'dollars' : 'tokens'
  )
  const [draft, setDraft] = useState<string | null>(null)
  const skipCommitRef = useRef(false)
  const unit: BudgetUnit =
    value?.cost != null
      ? 'dollars'
      : value?.tokens != null
        ? 'tokens'
        : preferredUnit

  const setUnit = (nextUnit: BudgetUnit) => {
    setPreferredUnit(nextUnit)
    onUnitChange?.(nextUnit)
    setDraft(null)
    onChange(defaultBudget(nextUnit))
  }
  const amount = unit === 'tokens' ? (value?.tokens ?? 0) : (value?.cost ?? 0)
  const increment =
    unit === 'tokens'
      ? tokenStepSize(amount > 0 ? amount : TOKEN_HUNDRED_THOUSAND)
      : dollarStepSize(amount)
  const displayAmount = draft ?? formatBudgetAmount(unit, amount)
  const amountRef = useRef(amount)
  const unitRef = useRef(unit)
  const incrementRef = useRef(increment)

  useEffect(() => {
    amountRef.current = amount
    unitRef.current = unit
    incrementRef.current = increment
  }, [amount, unit, increment])

  const commitDraft = () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false
      setDraft(null)
      return
    }
    if (draft == null) return

    const parsed = parseBudgetInput(draft)
    setDraft(null)
    if (parsed == null) return

    onChange(budgetForAmount(unit, normalizeBudgetAmount(unit, parsed)))
  }

  const stepBy = (delta: number) => {
    const currentAmount = amountRef.current
    const currentUnit = unitRef.current
    const currentIncrement = incrementRef.current

    setDraft(null)
    if (currentAmount <= 0 && delta < 0) return

    const next =
      currentAmount <= 0 && delta > 0
        ? currentIncrement
        : normalizeBudgetAmount(currentUnit, currentAmount + delta)

    amountRef.current = next
    onChange(budgetForAmount(currentUnit, next))
  }

  return (
    <ControlsGridSC $stacked={stacked}>
      <SegmentedControlSC $large={stacked}>
        <SegmentButtonSC
          type="button"
          $active={unit === 'dollars'}
          disabled={disabled}
          onClick={() => setUnit('dollars')}
        >
          Dollars
        </SegmentButtonSC>
        <SegmentButtonSC
          type="button"
          $active={unit === 'tokens'}
          disabled={disabled}
          onClick={() => setUnit('tokens')}
        >
          Tokens
        </SegmentButtonSC>
      </SegmentedControlSC>
      <StepperSC>
        <StepperButton
          aria-label={`Decrease ${unit} limit`}
          disabled={disabled || amount <= 0}
          onStep={() => stepBy(-increment)}
        >
          <MinusIcon size={12} />
        </StepperButton>
        <StepperValueSC>
          <span>{unit === 'tokens' ? 'Tokens' : 'Dollars'}</span>
          <StepperInputSC
            aria-label={`${unit} limit`}
            disabled={disabled}
            value={displayAmount}
            size={Math.max(3, displayAmount.length)}
            onFocus={(e) => {
              setDraft(formatBudgetAmount(unit, amount))
              e.currentTarget.select()
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                skipCommitRef.current = true
                e.currentTarget.blur()
              }
            }}
          />
        </StepperValueSC>
        <StepperButton
          aria-label={`Increase ${unit} limit`}
          disabled={
            disabled || (unit === 'dollars' && amount >= MAX_DOLLAR_LIMIT)
          }
          onStep={() => stepBy(increment)}
        >
          <PlusIcon size={12} />
        </StepperButton>
      </StepperSC>
    </ControlsGridSC>
  )
}

export function formatBudgetLimitLabel(
  value: WorkbenchJobBudgetAttributes | null | undefined
) {
  if (value?.cost != null && value.cost > 0)
    return formatBudgetAmount('dollars', value.cost)
  if (value?.tokens != null && value.tokens > 0)
    return formatBudgetAmount('tokens', value.tokens)
  return null
}

const defaultBudget = (unit: BudgetUnit): WorkbenchJobBudgetAttributes =>
  budgetForAmount(unit, 0)

const budgetForAmount = (
  unit: BudgetUnit,
  amount: number
): WorkbenchJobBudgetAttributes =>
  unit === 'tokens'
    ? { tokens: amount, cost: null }
    : { cost: amount, tokens: null }

const INFINITY_SYMBOL = '∞'

const formatBudgetAmount = (unit: BudgetUnit, amount: number) => {
  if (amount <= 0) return INFINITY_SYMBOL
  if (unit === 'tokens') return formatTokenCount(amount) ?? '0'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

const parseBudgetInput = (text: string) => {
  const trimmed = text.trim().replace(/^\$/, '').replace(/[,\s]/g, '')
  if (!trimmed) return null
  if (trimmed === INFINITY_SYMBOL || /^inf(inity)?$/i.test(trimmed)) return 0

  const match = trimmed.match(/^(\d+(?:\.\d+)?)([kmb])?$/i)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value)) return null

  const suffix = match[2]?.toLowerCase()
  const multiplier =
    suffix === 'k'
      ? TOKEN_THOUSAND
      : suffix === 'm'
        ? TOKEN_MILLION
        : suffix === 'b'
          ? 1_000_000_000
          : 1

  return value * multiplier
}

const normalizeBudgetAmount = (unit: BudgetUnit, amount: number) => {
  if (amount <= 0) return 0

  if (unit === 'dollars') {
    // Accept any positive dollar amount up to $1M, including cents.
    return Math.min(MAX_DOLLAR_LIMIT, Math.round(amount * 100) / 100)
  }

  // Under 100K → 100K; otherwise snap to the magnitude step (e.g. 1.23M → 1.2M).
  if (amount < TOKEN_HUNDRED_THOUSAND) return TOKEN_HUNDRED_THOUSAND

  const step = tokenStepSize(amount)
  return Math.round(amount / step) * step
}

const ControlsGridSC = styled.div<{ $stacked: boolean }>(
  ({ theme, $stacked }) => ({
    display: 'grid',
    gridTemplateColumns: $stacked ? '1fr' : '1fr 1fr',
    gap: $stacked ? theme.spacing.medium : theme.spacing.medium,
  })
)

const SegmentedControlSC = styled.div<{ $large: boolean }>(
  ({ theme, $large }) => ({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.xxsmall,
    height: $large ? 40 : 36,
    padding: theme.spacing.xxsmall,
    background: theme.colors['fill-one'],
    border: theme.borders['fill-two'],
    borderRadius: theme.borderRadiuses.medium,
  })
)

const SegmentButtonSC = styled.button<{ $active: boolean }>(
  ({ theme, $active }) => ({
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
    background: $active ? theme.colors['fill-three'] : 'transparent',
    border: 0,
    borderRadius: theme.borderRadiuses.medium,
    cursor: 'pointer',
    '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
  })
)

const StepperSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '52px 1fr 52px',
  height: 36,
  overflow: 'hidden',
  background: theme.colors['fill-one'],
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
}))

const StepperButtonSC = styled.button(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.colors['icon-light'],
  background: theme.colors['fill-three'],
  border: 0,
  cursor: 'pointer',
  userSelect: 'none',
  touchAction: 'none',
  '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
}))

const StepperValueSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  color: theme.colors['text-xlight'],
  borderInline: theme.borders['fill-two'],
}))

const StepperInputSC = styled.input(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  fieldSizing: 'content',
  minWidth: '3ch',
  maxWidth: '100%',
  padding: 0,
  border: 0,
  outline: 'none',
  textAlign: 'center',
  color: theme.colors.text,
  background: 'transparent',
  '&:disabled': {
    color: theme.colors['text-disabled'],
    cursor: 'not-allowed',
  },
}))

function StepperButton({
  onStep,
  disabled,
  children,
  ...props
}: {
  onStep: () => void
  disabled?: boolean
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'type'>) {
  const timeoutRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const onStepRef = useRef(onStep)

  useEffect(() => {
    onStepRef.current = onStep
  }, [onStep])

  const clearHold = () => {
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
    if (intervalRef.current != null) window.clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
  }

  useEffect(() => clearHold, [])
  useEffect(() => {
    if (disabled) clearHold()
  }, [disabled])

  return (
    <StepperButtonSC
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return
        suppressClickRef.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        onStepRef.current()
        timeoutRef.current = window.setTimeout(() => {
          intervalRef.current = window.setInterval(
            () => onStepRef.current(),
            HOLD_REPEAT_INTERVAL_MS
          )
        }, HOLD_REPEAT_DELAY_MS)
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onLostPointerCapture={clearHold}
      onClick={() => {
        // Keyboard activation still needs a click path; pointer already stepped.
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        if (!disabled) onStep()
      }}
      {...props}
    >
      {children}
    </StepperButtonSC>
  )
}
