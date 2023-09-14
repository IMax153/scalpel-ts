import * as Chunk from "@effect/data/Chunk"
import { dual } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as htmlTokenizer from "@effect/scraper/internal/htmlTokenizer"
import * as select from "@effect/scraper/internal/select"
import * as tagSpec from "@effect/scraper/internal/tagSpec"
import type * as Scraper from "@effect/scraper/Scraper"
import type * as Select from "@effect/scraper/Select"
import type * as TagSpec from "@effect/scraper/TagSpec"
import * as Stream from "@effect/stream/Stream"

/** @internal */
export const attr = (key: string, selector: Select.Selector): Scraper.Scraper<string> =>
  Effect.map(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return ReadonlyArray.head(ReadonlyArray.compact(ReadonlyArray.map(selected, (spec) => tagsToAttr(spec, key))))
  })

/** @internal */
export const attrs = (key: string, selector: Select.Selector): Scraper.Scraper<ReadonlyArray<string>> =>
  Effect.map(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return Option.some(ReadonlyArray.compact(ReadonlyArray.map(selected, (spec) => tagsToAttr(spec, key))))
  })

/** @internal */
export const chroot = dual<
  (selector: Select.Selector) => <A>(self: Scraper.Scraper<A>) => Scraper.Scraper<A>,
  <A>(self: Scraper.Scraper<A>, selector: Select.Selector) => Scraper.Scraper<A>
>(2, (self, selector) => chroots(self, selector).pipe(Effect.map(Option.flatMap(ReadonlyArray.head))))

/** @internal */
export const chroots = dual<
  (selector: Select.Selector) => <A>(self: Scraper.Scraper<A>) => Scraper.Scraper<ReadonlyArray<A>>,
  <A>(self: Scraper.Scraper<A>, selector: Select.Selector) => Scraper.Scraper<ReadonlyArray<A>>
>(2, (self, selector) =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    const scrapers = Effect.forEach(selected, (spec) => Effect.provideService(self, tagSpec.Tag, spec))
    return Effect.map(scrapers, (results) => {
      const result = ReadonlyArray.compact(results)
      return ReadonlyArray.isEmptyReadonlyArray(result) ? Option.none() : Option.some(result)
    })
  }))

/** @internal */
export const innerHTML = (selector: Select.Selector): Scraper.Scraper<string> =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return withFirst(selected, tagsToInnerHTML)
  })

/** @internal */
export const innerHTMLs = (selector: Select.Selector): Scraper.Scraper<ReadonlyArray<string>> =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return withAll(selected, tagsToInnerHTML)
  })

/** @internal */
export const html = (selector: Select.Selector): Scraper.Scraper<string> =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return withFirst(selected, tagsToHtml)
  })

/** @internal */
export const htmls = (selector: Select.Selector): Scraper.Scraper<ReadonlyArray<string>> =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return withAll(selected, tagsToHtml)
  })

/** @internal */
export const position: Scraper.Scraper<number> = Effect.map(tagSpec.Tag, (spec) => Option.some(tagsToPosition(spec)))

/** @internal */
export const satisfies = (selector: Select.Selector): Scraper.Scraper<void> =>
  Effect.map(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return ReadonlyArray.isEmptyReadonlyArray(selected)
      ? Option.none()
      : Option.some<void>(undefined)
  })

/** @internal */
export const scrape = dual<
  (
    source: string
  ) => <A>(
    self: Scraper.Scraper<A>
  ) => Effect.Effect<HtmlTokenizer.HtmlTokenizer, Error, Option.Option<A>>,
  <A>(
    self: Scraper.Scraper<A>,
    source: string
  ) => Effect.Effect<HtmlTokenizer.HtmlTokenizer, Error, Option.Option<A>>
>(2, (self, source) =>
  htmlTokenizer.tokenize(source).pipe(
    Stream.runCollect,
    Effect.flatMap((chunk) => tagSpec.tagsToSpec(Chunk.toReadonlyArray(chunk))),
    Effect.flatMap((spec) => Effect.provideService(self, tagSpec.Tag, spec))
  ))

/** @internal */
export const text = (selector: Select.Selector): Scraper.Scraper<string> =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return withFirst(selected, tagsToText)
  })

/** @internal */
export const texts = (selector: Select.Selector): Scraper.Scraper<ReadonlyArray<string>> =>
  Effect.flatMap(tagSpec.Tag, (spec) => {
    const selected = select.select(spec, selector)
    return withAll(selected, tagsToText)
  })

/**
 * Returns the value of the first attribute matching the specified `key`,
 * if present.
 *
 * @internal
 */
const getAttribute = dual<
  (key: string) => (attributes: ReadonlyArray<HtmlTokenizer.Attribute>) => Option.Option<string>,
  (attributes: ReadonlyArray<HtmlTokenizer.Attribute>, key: string) => Option.Option<string>
>(
  2,
  (attributes, key) =>
    ReadonlyArray.head(
      ReadonlyArray.filterMap(attributes, (attr) => attr.key === key ? Option.some(attr.value) : Option.none())
    )
)

/**
 * Maps over the tokens in a `TagSpec` returning the value of the first
 * attribute that matches the specified `key` on each token, if present.
 *
 * @internal
 */
const tagsToAttr = dual<
  (key: string) => (spec: TagSpec.TagSpec) => Option.Option<string>,
  (spec: TagSpec.TagSpec, key: string) => Option.Option<string>
>(2, (spec, key) =>
  Option.flatMap(
    ReadonlyArray.findFirst(spec.tags, (info) => info.token._tag === "TagOpen"),
    (info) => getAttribute((info.token as HtmlTokenizer.TagOpen).attributes, key)
  ))

/** @internal */
const renderAttribute = (attribute: HtmlTokenizer.Attribute): string => `${attribute.key}="${attribute.value}"`

const renderToken = (token: HtmlTokenizer.HtmlToken): string => {
  switch (token._tag) {
    case "TagOpen": {
      const attributes = token.attributes.map((attr) => renderAttribute(attr)).join(" ")
      const space = attributes.length > 0 ? " " : ""
      return `<${token.name}${space}${attributes}>`
    }
    case "TagClose": {
      return `</${token.name}>`
    }
    case "Text": {
      return token.text
    }
    case "Comment": {
      return `<!--${token.comment}-->`
    }
  }
}

/**
 * Maps over the tokens in a `TagSpec` returning a HTML string representation of
 * the token stream.
 *
 * @internal
 */
const tagsToHtml = (spec: TagSpec.TagSpec): string => spec.tags.map((info) => renderToken(info.token)).join("")

/**
 * Maps over the tokens in a `TagSpec` returning a HTML string representation of
 * the inner HTML for each token in the stream. In this case, *inner html*
 * refers to the set of tags within, but not including, the selected tags.
 *
 * @internal
 */
const tagsToInnerHTML = (spec: TagSpec.TagSpec): string => {
  const len = spec.tags.length
  return len < 2 ? "" : tagsToHtml({ ...spec, tags: spec.tags.slice(1, len - 1) })
}

/**
 * Maps a `TagSpec` into its corresponding position within the matched HTML
 * document.
 *
 * @internal
 */
const tagsToPosition = (spec: TagSpec.TagSpec): number => spec.context.position

/**
 * Maps over the tokens in a `TagSpec` returning the text from `Text` tokens.
 *
 * @internal
 */
const tagsToText = (spec: TagSpec.TagSpec): string =>
  spec.tags.map((info) => info.token._tag === "Text" ? info.token.text : "").join("")

/**
 * Takes a function which maps over the results of a `Selection` and returns the
 * first result as a `Scraper`.
 *
 * @internal
 */
const withFirst = dual<
  <A, B>(f: (value: A) => B) => (results: ReadonlyArray<A>) => Scraper.Scraper<B>,
  <A, B>(results: ReadonlyArray<A>, f: (value: A) => B) => Scraper.Scraper<B>
>(2, (results, f) => Effect.succeed(Option.map(ReadonlyArray.head(results), f)))

/**
 * Takes a function which maps over the results of a `Selection` and returns all
 * results as a `Scraper`.
 *
 * @internal
 */
const withAll = dual<
  <A, B>(f: (value: A) => B) => (results: ReadonlyArray<A>) => Scraper.Scraper<ReadonlyArray<B>>,
  <A, B>(results: ReadonlyArray<A>, f: (value: A) => B) => Scraper.Scraper<ReadonlyArray<B>>
>(2, (results, f) => Effect.succeed(Option.some(ReadonlyArray.map(results, f))))
