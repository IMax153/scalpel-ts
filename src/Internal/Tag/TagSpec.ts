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
 * @category model
 * @since 0.0.1
 */
export interface TagSpec {
  readonly context: SelectContext
  readonly hierarchy: TagForest
  readonly tokens: ReadonlyArray<TagInfo>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const TagSpec = (
  context: SelectContext,
  hierarchy: TagForest,
  tokens: ReadonlyArray<TagInfo>
): TagSpec => ({
  context,
  hierarchy,
  tokens
})

/**
 * Constructs a `TagSpec` from a stream of tokens parsed by the HTML parser.
 *
 * @category constructors
 * @since 0.0.1
 */
export const tokensToSpec = (tokens: ReadonlyArray<Token>): TagSpec => {
  const annotatedTokens = I.annotateTokens(tokens)
  const hierarchy = F.fromTagInfo(annotatedTokens)
  return TagSpec({ position: 0, inChroot: false }, hierarchy, annotatedTokens)
}
