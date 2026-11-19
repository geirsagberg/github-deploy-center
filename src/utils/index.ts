export function keysOf<T extends {}>(x: T): (keyof T)[] {
  return Object.keys(x) as (keyof T)[]
}

export function reorderRecord<T>(
  record: Record<string, T>,
  draggedKey: string,
  targetKey: string,
) {
  const keys = Object.keys(record)
  const fromIndex = keys.indexOf(draggedKey)
  const toIndex = keys.indexOf(targetKey)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return record
  }

  keys.splice(fromIndex, 1)
  keys.splice(toIndex, 0, draggedKey)

  return Object.fromEntries(keys.map((key) => [key, record[key]]))
}
