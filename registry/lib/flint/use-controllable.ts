import { useCallback, useState } from "react"

export interface UseControllableStateOptions<T> {
  value?: T
  defaultValue: T
  onChange?: (value: T) => void
}

/** Same contract as shadcn's Base UI primitives: controlled or uncontrolled. */
export function useControllableState<T>({ value, defaultValue, onChange }: UseControllableStateOptions<T>) {
  const [internal, setInternal] = useState<T>(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : internal

  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )

  return [current, set] as const
}
