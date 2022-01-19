import { orderBy } from 'lodash-es'

// eslint-disable-next-line no-extend-native
Array.prototype['orderBy'] = function <T>(
  this: Array<T>,
  selector: (t: T) => any,
  order?: 'asc' | 'desc'
): Array<T> {
  return orderBy(this, selector, order)
}

declare global {
  interface Array<T> {
    orderBy(
      selector: Many<(t: T) => any>,
      order?: Many<'asc' | 'desc'>
    ): Array<T>
  }
}
