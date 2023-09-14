import { dual } from "@effect/data/Function"
import type * as MatchResult from "@effect/scraper/MatchResult"

/** @internal */
export const ok: MatchResult.MatchResult = { _tag: "MatchOk" }

/** @internal */
export const fail: MatchResult.MatchResult = { _tag: "MatchFail" }

/** @internal */
export const cull: MatchResult.MatchResult = { _tag: "MatchCull" }

/** @internal */
export const fromBoolean = (bool: boolean): MatchResult.MatchResult => bool ? ok : fail

/** @internal */
export const combine = dual<
  (right: MatchResult.MatchResult) => (left: MatchResult.MatchResult) => MatchResult.MatchResult,
  (left: MatchResult.MatchResult, right: MatchResult.MatchResult) => MatchResult.MatchResult
>(2, (left, right) => {
  if (left._tag === "MatchCull" || right._tag === "MatchCull") {
    return cull
  }
  if (left._tag === "MatchOk" && right._tag === "MatchOk") {
    return ok
  }
  return fail
})
