/**
 * @since 1.0.0
 */
import type * as Option from "@effect/data/Option"
import type * as Effect from "@effect/io/Effect"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as internal from "@effect/scraper/internal/scraper"
import type * as Select from "@effect/scraper/Select"
import type * as TagSpec from "@effect/scraper/TagSpec"

/**
 * @since 1.0.0
 * @category models
 */
export type Scraper<A> = Effect.Effect<TagSpec.TagSpec, never, Option.Option<A>>

/**
 * The `attr` combinator takes an attribute `key` and a `Selector` and
 * returns the value of the attribute with the specified `key` for the
 * first opening tag that matches the specified `selector`.
 *
 * This function will only return the first opening tag matched by the
 * selector. To match every tag, use `attrs`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const attr: (key: string, selector: Select.Selector) => Scraper<string> = internal.attr

/**
 * The `attrs` combinator takes an attribute `key` and a `Selector` and
 * returns the value of the attribute with the specified `key` for every
 * opening tag (possibly nested) that matches the specified `selector`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const attrs: (key: string, selector: Select.Selector) => Scraper<ReadonlyArray<string>> = internal.attrs

/**
 * The `chroot` combinator takes a `Selector` and an inner `Scraper` and executes
 * the inner `scraper` as if it were scraping a document that consists solely of the
 * tags corresponding to the specified `selector`.
 *
 * This function will only match the first set of tags that match the selector. To
 * match every set of tags, use `chroots`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const chroot: {
  (selector: Select.Selector): <A>(self: Scraper<A>) => Scraper<A>
  <A>(self: Scraper<A>, selector: Select.Selector): Scraper<A>
} = internal.chroot

/**
 * The `chroots` combinator takes a `Selector` and an inner `Scraper` and executes
 * the inner `scraper` as if it were scraping a document that consists solely of the
 * tags corresponding to the specified `selector`.
 *
 * The inner scraper is executed for each set of tags (possibly nested) matching
 * the given selector.
 *
 * @since 1.0.0
 * @category combinators
 */
export const chroots: {
  (selector: Select.Selector): <A>(self: Scraper<A>) => Scraper<ReadonlyArray<A>>
  <A>(self: Scraper<A>, selector: Select.Selector): Scraper<ReadonlyArray<A>>
} = internal.chroots

/**
 * The `innerHTML` combinator takes a `Selector` and returns the inner HTML
 * string representation of the tags matched by the specified `selector`.
 * In this case, *inner html* refers to the set of tags within, but not
 * including, the selected tags.
 *
 * This function will only return the HTML string for the first tag matched
 * by the selector. To match every tag, use `innerHTMLs`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const innerHTML: (selector: Select.Selector) => Scraper<string> = internal.innerHTML

/**
 * The `innerHTMLs` combinator takes a `Selector` and returns the inner HTML
 * string representation of every set of tags (possibly nested) matched by
 * the specified `selector`. In this case, *inner html* refers to the set of
 * tags within, but not including, the selected tags.
 *
 * @since 1.0.0
 * @category combinators
 */
export const innerHTMLs: (selector: Select.Selector) => Scraper<ReadonlyArray<string>> = internal.innerHTMLs

/**
 * The `html` combinator takes a `Selector` and returns the HTML string
 * representation of the tags matched by the specified `selector`.
 *
 * This function will only return the HTML string for the first tag
 * matched by the selector. To match every tag, use `htmls`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const html: (selector: Select.Selector) => Scraper<string> = internal.html

/**
 * The `htmls` combinator takes a `Selector` and returns the HTML string
 * representation of every set of tags (possibly nested) matched by the
 * specified `selector`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const htmls: (selector: Select.Selector) => Scraper<ReadonlyArray<string>> = internal.htmls

/**
 * The `position` combinator is designed to be used to extract the position
 * of each HTML tag within the currently matched subtree. It is primarily
 * intended to be used in combination with the `chroots` combinator.
 *
 * For example, consider the following HTML:
 *
 * ```html
 * <article>
 *   <p>First paragraph.</p>
 *   <p>Second paragraph.</p>
 *   <p>Third paragraph.</p>
 * </article>
 * ```
 *
 * The `position` combinator can be used to determine the index of each `<p />`
 * tag tag within the `<article />` tag as follows:
 *
 * ```ts
 * import { pipe } from "@effect/data/Function"
 * import * as Option from "@effect/data/Option"
 * import * as Effect from "@effect/io/Effect"
 * import * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
 * import * as Scraper from "@effect/scraper/Scraper"
 * import * as Select from "@effect/scraper/Select"
 *
 * const source = `
 * <article>
 *   <p>First paragraph.</p>
 *   <p>Second paragraph.</p>
 *   <p>Third paragraph.</p>
 * </article>
 * `
 *
 * const selector = pipe(
 *   Select.tag("article"),
 *   Select.nested(Select.tag("p"))
 * )
 *
 * const program = Effect.gen(function*($) {
 *   const index = yield* $(Scraper.position)
 *   const content = yield* $(Scraper.texts(Select.tag("p")))
 *   return Option.all({ index, content })
 * }).pipe(
 *   Scraper.chroots(selector),
 *   Scraper.scrape(source),
 *   Effect.provideLayer(HtmlTokenizer.layer)
 * )
 *
 * Effect.runPromise(program).then((result) => console.dir(result, { depth: null }))
 *
 * // {
 * //   value: [
 * //     { index: 0, content: [ 'First paragraph.' ] },
 * //     { index: 1, content: [ 'Second paragraph.' ] },
 * //     { index: 2, content: [ 'Third paragraph.' ] }
 * //   ]
 * // }
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const position: Scraper<number> = internal.position

/**
 * The `satisfies` combinator takes a `Selector` and returns `void` if the
 * specified `selector` matches any node.
 *
 * @since 1.0.0
 * @category combinators
 */
export const satisfies: (selector: Select.Selector) => Scraper<void> = internal.satisfies

/**
 * The `scrape` function executes a `Scraper` on a sequence of `Token`s and
 * produces an optional value of type `A`.
 *
 * @since 1.0.0
 * @category scraping
 */
export const scrape: {
  (
    source: string
  ): <A>(
    self: Scraper<A>
  ) => Effect.Effect<HtmlTokenizer.HtmlTokenizer, Error, Option.Option<A>>
  <A>(
    self: Scraper<A>,
    source: string
  ): Effect.Effect<HtmlTokenizer.HtmlTokenizer, Error, Option.Option<A>>
} = internal.scrape

/**
 * The `text` combinator takes a `Selector` and returns the inner text from
 * the set of tags matched by the specified `selector`.
 *
 * This function will only return the first set of tags matched by the
 * selector. To match every tag, use `texts`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const text: (selector: Select.Selector) => Scraper<string> = internal.text

/**
 * The `text` combinator takes a `Selector` and returns the inner text from
 * every set of tags (possibly nested) matched by the specified `selector`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const texts: (selector: Select.Selector) => Scraper<ReadonlyArray<string>> = internal.texts
