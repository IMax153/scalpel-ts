/**
 * @since 0.0.1
 */
import type { Forest } from 'fp-ts/Tree'
import type { Endomorphism, Predicate } from 'fp-ts/function'
import * as A from 'fp-ts/Array' // `Tree` uses Array to represent the `Forest`
import * as B from 'fp-ts/boolean'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as Tree from 'fp-ts/Tree'
import { constFalse, constTrue, pipe } from 'fp-ts/function'

import type { Token } from '../Html/Tokenizer'
import type { TagInfo } from './TagInfo'
import * as T from '../Html/Tokenizer'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents the hierarchical structure of an HTML document. Nodes of the tree
 * are spans which mark the starting and ending indices of the tag within the
 * token stream. The tree is organized such that tags that appear earlier in
 * the token stream appear earlier in the list of nodes, and that a given node
 * is completely within the span of its parent node.
 *
 * @internal
 * @since 0.0.1
 */
export type TagForest = Forest<TagSpan>

/**
 * Represents the span of an HTML tag in terms of the index of the opening tag
 * and the index of the closing tag within the token stream. If there is not a
 * closing tag, the closing tag is equal to the opening tag.
 *
 * @internal
 * @since 0.0.1
 */
export interface TagSpan {
  readonly start: number
  readonly end: number
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const TagSpan = (start: number, end: number): TagSpan => ({
  start,
  end
})

const shouldSkip: Predicate<Token> = T.fold({
  TagOpen: constFalse,
  TagClose: constTrue,
  Text: constFalse,
  Comment: constTrue
})

interface Malformed {
  readonly ok: TagForest
  readonly bad: TagForest
}

/**
 * @internal
 */
export const malformed = (end: number) => (preBad: TagForest, remaining: TagForest): Malformed =>
  pipe(
    remaining,
    A.foldLeft(
      () => ({ ok: A.empty, bad: preBad }),
      (n, ns) => {
        // Determine which child trees are malformed
        const { ok, bad } = malformed(end)(preBad, ns)

        // Check if the current node lays outside the parent node and
        // hoist the node into the parent if necessary
        return end < n.value.end
          ? ({ ok, bad: A.cons(n, bad) } as Malformed)
          : ({ ok: A.cons(n, ok), bad } as Malformed)
      }
    )
  )

// Lifts nodes whose closing tags lay outside their parent up into a parent
// node that encompasses the node's entire span
const fixTree: Endomorphism<TagForest> = A.foldLeft(
  () => A.empty,
  ({ value: { start, end }, forest }, siblings) => {
    const { ok, bad } = malformed(end)(fixTree(siblings), fixTree(forest))
    return A.cons(Tree.make(TagSpan(start, end), ok), bad) as TagForest
  }
)

/**
 * Creates a `TagForest` describing the structure of a stream of tags annotated with
 * the span between their opening and closing tags. The nodes of the forest are tag
 * spans which mark the indices within the token info stream of an opening and
 * closing pair of tags.
 *
 * The tree is organized such that for any node `n` in the tree, the parent node `x`
 * of `n` is the smallest span that completely encapsulates the span of `n`.
 *
 * @internal
 * @since 0.0.1
 */
export const fromTagInfo = (tokenInfo: ReadonlyArray<TagInfo>): TagForest => {
  const forestWithin = (start: number, end: number): TagForest => {
    if (end <= start || RA.isOutOfBound(start, tokenInfo)) {
      return A.empty
    }

    const { token, closeOffset } = tokenInfo[start]

    return pipe(
      // Skip tags that do not have closing tags
      shouldSkip(token),
      B.fold(
        () => {
          // Calculate closing index of current tag
          const closeIndex = start + O.getOrElse(() => 0)(closeOffset)
          // Evaluate the span of each child of the current tag
          const subforest = forestWithin(start + 1, closeIndex)
          return pipe(
            // Evaluate the siblings of the current tag
            forestWithin(closeIndex + 1, end),
            // Prepend the span of the current tag and the span of each child
            // to the output
            A.cons(Tree.make(TagSpan(start, closeIndex), subforest))
          )
        },
        // Skip current tag and evaluate the next
        () => forestWithin(start + 1, end)
      )
    )
  }

  return pipe(forestWithin(0, tokenInfo.length), fixTree)
}
