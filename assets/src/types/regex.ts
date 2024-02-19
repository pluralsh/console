type RegExpGroups<T extends string> =
  | (RegExpMatchArray & {
      groups?: { [name in T]: string } | { [key: string]: string }
    })
  | null

export type { RegExpGroups }
