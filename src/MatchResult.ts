/**
 * @since 1.0.0
 */
import * as internal from "@effect/scraper/internal/matchResult"

/**
 * @since 1.0.0
 * @category models
 */
export type MatchResult = MatchOk | MatchFail | MatchCull

/**
 * @since 1.0.0
 * @category models
 */
export interface MatchOk {
  readonly _tag: "MatchOk"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MatchFail {
  readonly _tag: "MatchFail"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MatchCull {
  readonly _tag: "MatchCull"
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const ok: MatchResult = internal.ok

/**
 * @since 1.0.0
 * @category constructors
 */
export const fail: MatchResult = internal.fail

/**
 * @since 1.0.0
 * @category constructors
 */
export const cull: MatchResult = internal.cull

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromBoolean: (bool: boolean) => MatchResult = internal.fromBoolean

/**
 * @since 1.0.0
 * @category combinators
 */
export const combine: {
  (right: MatchResult): (left: MatchResult) => MatchResult
  (left: MatchResult, right: MatchResult): MatchResult
} = internal.combine
