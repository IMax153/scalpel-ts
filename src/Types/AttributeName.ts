import { absurd, constTrue } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// models
// -------------------------------------------------------------------------------------

/**
 * Represents a value that can be used when creating `Selector`s to specify
 * the name of an attribute of a tag.
 *
 * @category model
 * @since 0.0.1
 */
export type AttributeName = AnyAttribute | AttributeString

/**
 * @category model
 * @since 0.0.1
 */
export interface AnyAttribute {
  readonly _tag: 'AnyAttribute'
}

/**
 * @category model
 * @since 0.0.1
 */
export interface AttributeString {
  readonly _tag: 'AttributeString'
  readonly str: string
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const AnyAttribute: AttributeName = {
  _tag: 'AnyAttribute'
}

/**
 * @category constructors
 * @since 0.0.1
 */
export const AttributeString = (str: string): AttributeName => ({
  _tag: 'AttributeString',
  str
})

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.0.1
 */
export const fold = <R>(patterns: {
  readonly AnyAttribute: () => R
  readonly AttributeString: (str: string) => R
}): ((name: AttributeName) => R) => {
  const f = (x: AttributeName): R => {
    switch (x._tag) {
      case 'AnyAttribute':
        return patterns.AnyAttribute()
      case 'AttributeString':
        return patterns.AttributeString(x.str)
      default:
        return absurd<R>(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

export const matchKey: (attrName: AttributeName) => (name: string) => boolean = fold({
  AnyAttribute: () => constTrue,
  AttributeString: (s) => (n: string) => n.toLowerCase() === s.toLowerCase()
})
