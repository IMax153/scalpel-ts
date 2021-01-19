/**
 * @since 0.0.1
 */
import type { SelectContext } from '../../Select'
import type { Token } from '../Html/Tokenizer'
import type { TagForest } from './TagForest'
import type { TagInfo } from './TagInfo'
import * as F from './TagForest'
import * as I from './TagInfo'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents a structure containing the parsed token information, the
 * hierarchy of the document, and the context of the selection.
 *
 * @internal
 * @since 0.0.1
 */
export interface TagSpec {
  readonly context: SelectContext
  readonly hierarchy: TagForest
  readonly tags: ReadonlyArray<TagInfo>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const TagSpec = (
  context: SelectContext,
  hierarchy: TagForest,
  tags: ReadonlyArray<TagInfo>
): TagSpec => ({
  context,
  hierarchy,
  tags
})

/**
 * Constructs a `TagSpec` from a stream of tokens parsed by the HTML parser.
 *
 * @internal
 * @since 0.0.1
 */
export const tagsToSpec = (tokens: ReadonlyArray<Token>): TagSpec => {
  const annotatedTags = I.annotateTags(tokens)
  const hierarchy = F.fromTagInfo(annotatedTags)
  return TagSpec({ position: 0, inChroot: false }, hierarchy, annotatedTags)
}
