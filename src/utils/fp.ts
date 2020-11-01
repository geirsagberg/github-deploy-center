import { getOrElse, getOrElseW } from 'fp-ts/lib/Either'
import { constant, constNull } from 'fp-ts/lib/function'

export const orNull = () => getOrElseW(constNull)

export const or = <A>(a: A) => getOrElse(constant(a))
