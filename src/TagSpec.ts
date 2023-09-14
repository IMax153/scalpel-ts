/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Effect from "@effect/io/Effect"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as internal from "@effect/scraper/internal/tagSpec"
import type * as Select from "@effect/scraper/Select"
import type * as TagInfo from "@effect/scraper/TagInfo"
import type * as TagSpan from "@effect/scraper/TagSpan"

/**
 * Represents a structure containing the parsed token information, the
 * hierarchy of the document, and the context of the selection.
 *
 * @since 1.0.0
 * @category models
 */
export interface TagSpec {
  readonly context: Select.Select.Context
  readonly hierarchy: TagSpan.TagForest
  readonly tags: ReadonlyArray<TagInfo.TagInfo>
}

/**
 * The service tag for a `TagSpec`.
 *
 * @since 1.0.0
 * @category context
 */
export const TagSpec: Context.Tag<TagSpec, TagSpec> = internal.Tag

/**
 * Constructs a new `TagSpec`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  context: Select.Select.Context,
  hierarchy: TagSpan.TagForest,
  tags: ReadonlyArray<TagInfo.TagInfo>
) => TagSpec = internal.make

/**
 * Constructs a `TagSpec` from a stream of tokens parsed by the HTML parser.
 *
 * @since 1.0.0
 * @category constructors
 */
export const tagsToSpec: (tokens: ReadonlyArray<HtmlTokenizer.HtmlToken>) => Effect.Effect<never, never, TagSpec> =
  internal.tagsToSpec
