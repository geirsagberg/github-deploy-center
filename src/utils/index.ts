export function keysOf<T extends {}>(x: T): (keyof T)[] {
  return Object.keys(x) as (keyof T)[]
}
