import { SetNonNullable, SetRequired } from 'type-fest'

export type SetReqNonNull<
  BaseType,
  Keys extends keyof BaseType = keyof BaseType,
> = SetRequired<SetNonNullable<BaseType, Keys>, Keys>
