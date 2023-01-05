import deepMerge from 'deepmerge'
import {Dictionary, ObjectIterator, ValueKeyIteratee} from 'lodash'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Deep merges the two objects and returns a new object with the merge result.
 *
 * @param lhs - One of the objects to be merged.
 * @param rhs - Another object to be merged.
 * @param arrayMergeStrategy - Strategy used to merge the array typed fields. Union strategy is used by default to avoid
 * duplicated elements.
 * @returns A Javascrip tobject with th emerged objects.
 */
export function deepMergeObjects<T1, T2>(
  lhs: Partial<T1>,
  rhs: Partial<T2>,
  arrayMergeStrategy: (destinationArray: unknown[], sourceArray: unknown[]) => unknown[] = unionArrayStrategy,
): T1 & T2 {
  return deepMerge(lhs, rhs, {arrayMerge: arrayMergeStrategy})
}

function unionArrayStrategy(destinationArray: unknown[], sourceArray: unknown[]): unknown[] {
  return Array.from(new Set([...destinationArray, ...sourceArray]))
}

/**
 * Creates an object composed of the `object` properties `predicate` returns
 * truthy for. The predicate is invoked with two arguments: (value, key).
 *
 * @param object-  The source object.
 * @param predicate - The function invoked per property.
 * @returns Returns the new object.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function pickBy<T, S extends T>(
  object: Dictionary<T> | null | undefined,
  predicate?: ValueKeyIteratee<T>,
): Dictionary<S> {
  const lodashPickBy = require('lodash/pickBy.js')
  return lodashPickBy(object, predicate)
}

/**
 * Creates an object with the same keys as object and values generated by running each own
 * enumerable property of object through iteratee. The iteratee function is
 * invoked with three arguments: (value, key, object).
 *
 * @param object - The object to iterate over.
 * @param callback -  The function invoked per iteration.
 * @returns Returns the new mapped object.
 */
export function mapValues<T extends object, TResult>(
  obj: T | null | undefined,
  callback: ObjectIterator<T, TResult>,
): {[P in keyof T]: TResult} {
  const lodashMapValues = require('lodash/mapValues.js')
  return lodashMapValues(obj, callback)
}
