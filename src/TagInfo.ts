/**
 * This module is responsible for defining the algorithm which annotates tokens
 * with the calculated offset of their associated closing tag in the parsed
 * token stream.
 *
 * The algorithm takes in a list of tokens and associates each token with its
 * index in the parsed token stream. A map of unclosed opening HTML tags is
 * maintained, keyed by tag name. The annotation steps are as follows:
 *
 * 1. When an opening tag is encountered in the parsed token stream, it is
 * prepended to the token stack associated with its name in the token map.
 *
 * 2. When a closing tag is encountered, the corresponding opening tag is popped
 * of off the token stack associated with its name and the offset between the
 * two is computed. The opening tag is annotated with the offset, and both
 * tokens are added to the result set.
 *
 * 3. When any other tag is encountered, it is immediately added to the result
 * set.
 *
 * 4. After all tags are either in the result set or in the token map, all
 * unclosed tags from the token map are added to the result set without a
 * closing offset.
 *
 * 5. The result set is then sorted by their indices.
 *
 * @since 1.0.0
 */
import type * as Option from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as internal from "@effect/scraper/internal/tagInfo"

/**
 * Represents a token and its pre-computed metadata which can be accessed in tight
 * inner loops while scraping.
 *
 * @since 1.0.0
 * @category models
 */
export interface TagInfo {
  /**
   * The parsed token.
   */
  readonly token: HtmlTokenizer.HtmlToken
  /**
   * The offset from the parsed token to the token that contains its closing tag,
   * if present. The only tokens that will have an offset are `TagOpen` tokens.
   */
  readonly closeOffset: Option.Option<number>
}

/**
 * Constructs a new `TagInfo` from an `HtmlToken` and its closing offset (if
 * present).
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (token: HtmlTokenizer.HtmlToken, closeOffset: Option.Option<number>) => TagInfo = internal.make

/**
 * Annotates each parsed HTML tag with the the offset to its closing tag (if
 * present).
 *
 * @since 1.0.0
 * @category utilities
 */
export const annotateTags: (
  tokens: ReadonlyArray<HtmlTokenizer.HtmlToken>
) => Effect.Effect<never, never, ReadonlyArray<TagInfo>> = internal.annotateTags
