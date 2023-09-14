import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import type * as TagInfo from "@effect/scraper/TagInfo"
import type * as TagSpan from "@effect/scraper/TagSpan"

/** @internal */
export const make = (start: number, end: number): TagSpan.TagSpan => ({
  start,
  end
})

/** @internal */
interface Malformed {
  /**
   * Represents child nodes which are not malformed.
   */
  readonly ok: TagSpan.TagForest
  /**
   * Represents child nodes which are malformed.
   */
  readonly bad: TagSpan.TagForest
}

/**
 * Determines which nodes within the tag forest are malformed.
 *
 * @internal
 */
const malformed = (preBad: TagSpan.TagForest, remaining: TagSpan.TagForest, end: number): Malformed => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(remaining)) {
    const head = remaining[0]
    const tail = remaining.slice(1)
    // Determine which child trees are malformed
    const { bad, ok } = malformed(preBad, tail, end)
    // Check if the current node lays outside the parent node and
    // hoist the node into the parent if necessary
    return end < head.value.end
      ? ({ ok, bad: ReadonlyArray.prepend(bad, head) })
      : ({ ok: ReadonlyArray.prepend(ok, head), bad })
  }
  return ({ ok: ReadonlyArray.empty(), bad: preBad })
}

/**
 * Lifts nodes whose closing tags lay outside their parent up into a parent
 * node that encompasses the node's entire span.
 *
 * @internal
 */
const fixTree = (tagForest: TagSpan.TagForest): TagSpan.TagForest => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(tagForest)) {
    const { forest, value: { end, start } } = tagForest[0]
    const siblings = tagForest.slice(1)
    const { bad, ok } = malformed(fixTree(siblings), fixTree(forest), end)
    return ReadonlyArray.prepend(bad, { value: make(start, end), forest: ok })
  }
  return ReadonlyArray.empty()
}

/** @internal */
export const fromTagInfo = (tagInfo: ReadonlyArray<TagInfo.TagInfo>): TagSpan.TagForest => {
  const forestWithin = (start: number, end: number): TagSpan.TagForest => {
    if (end <= start || start >= tagInfo.length) {
      return ReadonlyArray.empty()
    }
    const { closeOffset, token } = tagInfo[start]
    if (token._tag === "Comment" || token._tag === "TagClose") {
      // Skip current tag and evaluate the next
      return forestWithin(start + 1, end)
    }
    // Calculate closing index of current tag
    const closeIndex = start + Option.getOrElse(closeOffset, () => 0)
    // Evaluate the span of each child of the current tag
    const subforest = forestWithin(start + 1, closeIndex)
    // Evaluate the siblings of the current tag
    const siblings = forestWithin(closeIndex + 1, end)
    // Prepend the span of the current tag and the span of each child to the output
    return ReadonlyArray.prepend(siblings, { value: make(start, closeIndex), forest: subforest })
  }
  return fixTree(forestWithin(0, tagInfo.length))
}
