/**
 * @since 0.0.1
 */
import * as B from 'fp-ts/boolean'
import { Semigroup } from 'fp-ts/Semigroup'
import { absurd } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents the result of a `Selection`.
 *
 * @category model
 * @since 0.0.1
 */
export type MatchResult = MatchOk | MatchFail | MatchCull

/**
 * @category model
 * @since 0.0.1
 */
export type MatchOk = 'MatchOk'

/**
 * @category model
 * @since 0.0.1
 */
export type MatchFail = 'MatchFail'

/**
 * @category model
 * @since 0.0.1
 */
export type MatchCull = 'MatchCull'

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const MatchOk: MatchResult = 'MatchOk'

/**
 * @internal
 * @since 0.0.1
 */
export const MatchFail: MatchResult = 'MatchFail'

/**
 * @internal
 * @since 0.0.1
 */
export const MatchCull: MatchResult = 'MatchCull'

/**
 * @internal
 * @since 0.0.1
 */
export const fromBoolean: (bool: boolean) => MatchResult = B.fold(
  () => MatchFail,
  () => MatchOk
)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const fold = <R>(patterns: {
  readonly MatchOk: () => R
  readonly MatchFail: () => R
  readonly MatchCull: () => R
}): ((result: MatchResult) => R) => {
  const f = (x: MatchResult): R => {
    switch (x) {
      case 'MatchOk':
        return patterns.MatchOk()
      case 'MatchFail':
        return patterns.MatchFail()
      case 'MatchCull':
        return patterns.MatchCull()
      default:
        return absurd<R>(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const semigroupMatchResult: Semigroup<MatchResult> = {
  concat: (x, y) => {
    if (x === MatchCull || y === MatchCull) return MatchCull
    if (x === MatchOk && y === MatchOk) return MatchOk
    return MatchFail
  }
}
