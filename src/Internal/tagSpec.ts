import * as Context from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as tagInfo from "@effect/scraper/internal/tagInfo"
import * as tagSpan from "@effect/scraper/internal/tagSpan"
import type * as Select from "@effect/scraper/Select"
import type * as TagInfo from "@effect/scraper/TagInfo"
import type * as TagSpan from "@effect/scraper/TagSpan"
import type * as TagSpec from "@effect/scraper/TagSpec"

/** @internal */
export const make = (
  context: Select.Select.Context,
  hierarchy: TagSpan.TagForest,
  tags: ReadonlyArray<TagInfo.TagInfo>
): TagSpec.TagSpec => ({
  context,
  hierarchy,
  tags
})

/** @internal */
export const Tag = Context.Tag<TagSpec.TagSpec>()

/** @internal */
export const tagsToSpec = (
  tokens: ReadonlyArray<HtmlTokenizer.HtmlToken>
): Effect.Effect<never, never, TagSpec.TagSpec> =>
  tagInfo.annotateTags(tokens).pipe(
    Effect.map((annotatedTags) => {
      const hierarchy = tagSpan.fromTagInfo(annotatedTags)
      return make({ position: 0, inChroot: false }, hierarchy, annotatedTags)
    })
  )
