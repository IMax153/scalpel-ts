import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Order from "@effect/data/Order"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import type * as TagInfo from "@effect/scraper/TagInfo"

/** @internal */
export const make = (
  token: HtmlTokenizer.HtmlToken,
  closeOffset: Option.Option<number> = Option.none()
): TagInfo.TagInfo => ({
  token,
  closeOffset
})

/** @internal */
interface IndexedToken {
  readonly index: number
  readonly token: HtmlTokenizer.HtmlToken
}

/** @internal */
interface IndexedTagInfo {
  readonly index: number
  readonly info: TagInfo.TagInfo
}

/** @internal */
const indexedToken = (index: number, token: HtmlTokenizer.HtmlToken): IndexedToken => ({
  index,
  token
})

/** @internal */
const indexedTagInfo = (index: number, info: TagInfo.TagInfo): IndexedTagInfo => ({
  index,
  info
})

/** @internal */
type TagMap = Map<string, ReadonlyArray<IndexedToken>>

const orderIndexedTagInfo = pipe(
  Order.number,
  Order.mapInput((indexed: IndexedTagInfo) => indexed.index)
)

/** @internal */
export const annotateTags = (
  tokens: ReadonlyArray<HtmlTokenizer.HtmlToken>
): Effect.Effect<never, never, ReadonlyArray<TagInfo.TagInfo>> =>
  Ref.make<TagMap>(new Map()).pipe(
    Effect.flatMap((ref) =>
      Effect.forEach(tokens, toIndexedTagInfo(ref)).pipe(
        Effect.flatMap((processed) =>
          getRemainingTagInfo(ref).pipe(
            Effect.map((remaining) => ReadonlyArray.append(processed, remaining)),
            Effect.map(ReadonlyArray.flatten),
            Effect.map(ReadonlyArray.sort(orderIndexedTagInfo))
          )
        )
      )
    ),
    Effect.map(ReadonlyArray.map(({ info }) => info))
  )

/**
 * Associates a tag with its index in the parsed token stream as well as the
 * calculated offset from its closing tag (if present).
 *
 * See steps 1-3 of the algorithm.
 *
 * @internal
 */
const toIndexedTagInfo = (ref: Ref.Ref<TagMap>) =>
(
  token: HtmlTokenizer.HtmlToken,
  index: number
): Effect.Effect<never, never, ReadonlyArray<IndexedTagInfo>> => {
  switch (token._tag) {
    case "TagOpen": {
      return Ref.modify(ref, (map) => {
        const tokens = map.get(token.name)
        if (tokens === undefined) {
          return [
            ReadonlyArray.empty(),
            map.set(token.name, ReadonlyArray.of(indexedToken(index, token)))
          ]
        } else {
          return [
            ReadonlyArray.empty(),
            map.set(token.name, ReadonlyArray.append(tokens, indexedToken(index, token)))
          ]
        }
      })
    }
    case "TagClose": {
      return Ref.modify(ref, (map) => {
        const tokens = map.get(token.name)
        if (tokens === undefined) {
          const tagInfo = indexedTagInfo(index, make(token))
          return [ReadonlyArray.of(tagInfo), map]
        }
        map.set(token.name, tokens.slice(1))
        const openingToken = tokens[0]
        if (openingToken === undefined) {
          const tagInfo = indexedTagInfo(index, make(token))
          return [ReadonlyArray.of(tagInfo), map]
        }
        const closingToken = indexedToken(index, token)
        const openingTag = calculateOffset(openingToken, closingToken)
        const closingTag = indexedTagInfo(index, make(token))
        return [ReadonlyArray.make(openingTag, closingTag), map]
      })
    }
    case "Comment":
    case "Text": {
      const tagInfo = indexedTagInfo(index, make(token))
      return Effect.succeed(ReadonlyArray.of(tagInfo))
    }
  }
}

/**
 * Calculates the `IndexedTagInfo` for all remaining unclosed tags from the
 * token map.
 *
 * See step 4 of the algorithm.
 *
 * @internal
 */
const getRemainingTagInfo = (ref: Ref.Ref<TagMap>): Effect.Effect<never, never, ReadonlyArray<IndexedTagInfo>> =>
  Ref.get(ref).pipe(
    Effect.map((tagMap) => ReadonlyArray.flatten(ReadonlyArray.fromIterable(tagMap.values()))),
    Effect.map((indexedTokens) =>
      indexedTokens.map(({ index, token }) => ({ index, info: { token, closeOffset: Option.none() } }))
    )
  )

/**
 * Calculates the offset between the starting tag and the ending tag.
 *
 * @internal
 */
const calculateOffset = (start: IndexedToken, end: IndexedToken): IndexedTagInfo => {
  const info = make(start.token, Option.some(end.index - start.index))
  return indexedTagInfo(start.index, info)
}
