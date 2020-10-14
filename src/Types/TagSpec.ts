import type { Token } from '../Html/Token'
import type { SelectContext } from '../Select'
import { fromTokenInfo, TagForest } from './TagForest'
import { annotateTokens, TokenInfo } from './TokenInfo'

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
  readonly tokens: ReadonlyArray<TokenInfo>
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
  tokens: ReadonlyArray<TokenInfo>
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
  const annotatedTokens = annotateTokens(tokens)
  const hierarchy = fromTokenInfo(annotatedTokens)
  return TagSpec({ position: 0, inChroot: false }, hierarchy, annotatedTokens)
}
