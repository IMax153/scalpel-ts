/**
 * @since 1.0.0
 */
import * as internal from "@effect/scraper/internal/tagSpan"
import type * as TagInfo from "@effect/scraper/TagInfo"

/**
 * Represents the span of an HTML tag in terms of the index of the opening tag
 * and the index of the closing tag within the token stream. If there is not a
 * closing tag, the closing tag is equal to the opening tag.
 *
 * @since 1.0.0
 * @category models
 */
export interface TagSpan {
  readonly start: number
  readonly end: number
}

/**
 * Represents the hierarchical structure of an HTML document. Nodes of the tree
 * are spans which mark the starting and ending indices of the tag within the
 * token stream. The tree is organized such that tags that appear earlier in
 * the token stream appear earlier in the list of nodes, and that a given node
 * is completely within the span of its parent node.
 *
 * @since 1.0.0
 * @category models
 */
export type TagForest = Forest<TagSpan>

/**
 * Represents a tree of values.
 *
 * @since 1.0.0
 * @category models
 */
export interface Tree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

/**
 * Represents the forest of sub-nodes within a `Tree` of values.
 *
 * @since 1.0.0
 * @category models
 */
export type Forest<A> = ReadonlyArray<Tree<A>>

/**
 * Constructs a new `TagSpan`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (start: number, end: number) => TagSpan = internal.make

/**
 * Creates a `TagForest` describing the structure of a stream of tags annotated
 * with the span between their opening and closing tags. The nodes of the forest
 * are tag spans which mark the indices within the token info stream of an
 * opening and closing pair of tags.
 *
 * The tree is organized such that for any node `n` in the tree, the parent node
 * `x` of `n` is the smallest span that completely encapsulates the span of `n`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromTagInfo: (tagInfo: ReadonlyArray<TagInfo.TagInfo>) => TagForest = internal.fromTagInfo
