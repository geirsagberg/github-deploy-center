export function keysOf<T extends {}>(x: T): (keyof T)[] {
  return Object.keys(x) as (keyof T)[]
}

export function reorderKeys(
  keys: string[],
  draggedKey: string,
  targetKey: string,
) {
  const fromIndex = keys.indexOf(draggedKey)
  const toIndex = keys.indexOf(targetKey)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return keys
  }

  const reordered = [...keys]
  reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, draggedKey)
  return reordered
}

export function reorderRecord<T>(
  record: Record<string, T>,
  draggedKey: string,
  targetKey: string,
) {
  const keys = Object.keys(record)
  const reordered = reorderKeys(keys, draggedKey, targetKey)

  if (reordered === keys) return record

  return Object.fromEntries(reordered.map((key) => [key, record[key]]))
}
