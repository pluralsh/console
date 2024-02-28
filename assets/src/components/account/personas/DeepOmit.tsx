/** Union of primitives to skip with deep omit utilities. */
type Primitive =
  | string
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function
  | number
  | boolean
  | symbol
  | undefined
  | null

/** Deeply omit members of an interface or type. */
export type DeepOmit<T, K extends keyof any> = T extends Primitive
  ? T
  : T extends any[]
  ? {
      [P in keyof T]: DeepOmit<T[P], K>
    }
  : {
      [P in Exclude<keyof T, K>]: T[P] extends infer TP // Distribute over unions
        ? DeepOmit<TP, K>
        : never
    }
