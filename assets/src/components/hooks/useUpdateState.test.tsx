import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useUpdateState } from './useUpdateState'

type State = {
  title: string
  characters?: { name: string }[]
}
const chars = [{ name: 'Chewy' }, { name: 'Han' }]

describe('useUpdateState', () => {
  it('should return a default search state', () => {
    const initialState: State = { title: 'Star Wars' }
    const { result } = renderHook(() => useUpdateState<State>(initialState))

    expect(result.current.state).toStrictEqual(initialState)
  })

  it('should not update if no changes', () => {
    const initialState: State = { title: 'Star Wars' }

    const { result } = renderHook(() => useUpdateState<State>(initialState))
    let lastState = result.current.state

    act(() => {
      result.current.update({})
    })
    expect(result.current.state).toBe(lastState)
    lastState = result.current.state

    act(() => {
      result.current.update({ title: initialState.title.slice() })
    })
    expect(result.current.state).toBe(lastState)
  })

  it('should update and reset state', () => {
    const initialState: State = { title: 'Star Wars' }
    const { result } = renderHook(() => useUpdateState<State>(initialState))

    act(() => {
      result.current.update({ characters: chars })
    })
    expect(result.current.state).toStrictEqual({
      ...initialState,
      characters: chars,
    })
    expect(result.current.state.characters).toBe(chars)

    act(() => {
      result.current.update({ characters: [{ name: 'Leia' }] })
    })
    expect(result.current.state.characters).toStrictEqual([{ name: 'Leia' }])

    act(() => {
      result.current.update({ characters: undefined })
    })
    expect(result.current.state).toEqual(initialState)
    expect(result.current.state).not.toStrictEqual(initialState)

    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toStrictEqual(initialState)
  })

  it('should update and reset errors', () => {
    const initialState: State = { title: 'Star Wars' }
    const { result } = renderHook(() => useUpdateState<State>(initialState))

    act(() => {
      result.current.updateErrors({ characters: true })
    })
    expect(result.current.errors.characters).toBeTruthy()

    act(() => {
      result.current.updateErrors({ characters: false, title: true })
    })
    expect(result.current.errors.characters).toBeFalsy()
    expect(result.current.errors.title).toBeTruthy()

    act(() => {
      result.current.updateErrors({ characters: undefined, title: undefined })
    })
    expect(result.current.errors.characters).toBeFalsy()
    expect(result.current.errors.title).toBeFalsy()
    expect(result.current.errors).toEqual({})

    act(() => {
      result.current.clearErrors()
    })
    expect(result.current.errors).toStrictEqual({})
  })

  it('functions should remain stable across updates', () => {
    const initialState: State = { title: 'Star Wars' }
    const { result } = renderHook(() => useUpdateState<State>(initialState))
    const initialResult = result.current

    act(() => {
      result.current.update({ characters: chars })
    })
    expect(result.current.update).toBe(initialResult.update)
    expect(result.current.reset).toBe(initialResult.reset)
    expect(result.current.updateErrors).toBe(initialResult.updateErrors)
    expect(result.current.clearErrors).toBe(initialResult.clearErrors)

    act(() => {
      result.current.updateErrors({ title: true })
    })
    expect(result.current.update).toBe(initialResult.update)
    expect(result.current.reset).toBe(initialResult.reset)
    expect(result.current.updateErrors).toBe(initialResult.updateErrors)
    expect(result.current.clearErrors).toBe(initialResult.clearErrors)
  })

  it('should reset to most recent value of initialState', () => {
    const firstInitialState: State = { title: 'Star Wars' }
    const secondInitialState: State = {
      title: 'A Few Good Men',
      characters: [{ name: 'Tom Cruise' }],
    }
    const { result, rerender } = renderHook(
      ({ initialState }) => useUpdateState<State>(initialState),
      { initialProps: { initialState: firstInitialState } }
    )

    expect(result.current.state).toStrictEqual(firstInitialState)
    rerender({ initialState: secondInitialState })
    expect(result.current.state).toStrictEqual(firstInitialState)
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toStrictEqual(secondInitialState)
  })
})
