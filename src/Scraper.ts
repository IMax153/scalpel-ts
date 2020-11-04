/**
 * @since 0.0.1
 */
import type { Option } from 'fp-ts/Option'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { constVoid, flow, identity, not, pipe } from 'fp-ts/function'

import type { Attribute } from './Internal/Html/Tokenizer'
import type { TagSpec } from './Internal/Tag/TagSpec'
import type { ReaderOption } from './Internal/ReaderOption'
import type { Selector } from './Select'
import * as T from './Internal/Html/Tokenizer'
import * as RO from './Internal/ReaderOption'
import * as TS from './Internal/Tag/TagSpec'
import * as S from './Select'

export * from './Internal/ReaderOption'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.0.1
 */
export type Scraper<A> = ReaderOption<TagSpec, A>

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * The `chroots` combinator takes a `Selector` and an inner `Scraper` and executes
 * the inner `scraper` as if it were scraping a document that consists solely of the
 * tags corresponding to the specified `selector`.
 *
 * The inner scraper is executed for each set of tags (possibly nested) matching
 * the given selector.
 *
 * @category combinators
 * @since 0.0.1
 */
export const chroots = (selector: Selector) => <A>(
  scraper: Scraper<A>
): Scraper<ReadonlyArray<A>> =>
  pipe(RO.asks(S.select(selector)), RO.map(flow(RA.map(scraper), RA.compact)))

/**
 * The `chroot` combinator takes a `Selector` and an inner `Scraper` and executes
 * the inner `scraper` as if it were scraping a document that consists solely of the
 * tags corresponding to the specified `selector`.
 *
 * This function will only match the first set of tags that match the selector. To
 * match every set of tags, use `chroots`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const chroot = (selector: Selector): (<A>(scraper: Scraper<A>) => Scraper<A>) =>
  flow(chroots(selector), RO.chainOptionK(flow(RA.head)))

/**
 * The `matches` combinator takes a `Selector` and returns `void` if the specified
 * `selector` matches any node in the DOM.
 *
 * @category combinators
 * @since 0.0.1
 */
export const matches = (selector: Selector): Scraper<void> =>
  pipe(
    RO.asks(S.select(selector)),
    RO.chain<TagSpec, ReadonlyArray<TagSpec>, void>(
      flow(RO.fromPredicate(not(RA.isEmpty)), RO.map(constVoid))
    )
  )

/**
 * The `text` combinator takes a `Selector` and returns the inner text from
 * the set of tags matched by the specified `selector`.
 *
 * This function will only return the first set of tags matched by the
 * selector. To match every tag, use `texts`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const text = (selector: Selector): Scraper<string> =>
  pipe(RO.asks(S.select(selector)), RO.chain(withFirst(tagsToText)))

/**
 * The `text` combinator takes a `Selector` and returns the inner text from
 * every set of tags (possibly nested) matched by the specified `selector`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const texts = (selector: Selector): Scraper<ReadonlyArray<string>> =>
  pipe(RO.asks(S.select(selector)), RO.chain(withAll(tagsToText)))

/**
 * The `attr` combinator takes an attribute `key` and a `Selector` and
 * returns the value of the attribute with the specified `key` for the
 * first opening tag that matches the specified `selector`.
 *
 * This function will only return the first opening tag matched by the
 * selector. To match every tag, use `attrs`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const attr = (key: string, selector: Selector): Scraper<string> =>
  pipe(
    RO.asks(S.select(selector)),
    RO.chainOptionK(flow(RA.map(tagsToAttr(key)), RA.compact, RA.head))
  )

/**
 * The `attrs` combinator takes an attribute `key` and a `Selector` and
 * returns the value of the attribute with the specified `key` for every
 * opening tag (possibly nested) that matches the specified `selector`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const attrs = (key: string, selector: Selector): Scraper<ReadonlyArray<string>> =>
  pipe(RO.asks(S.select(selector)), RO.map(flow(RA.map(tagsToAttr(key)), RA.compact)))

/**
 * The `html` combinator takes a `Selector` and returns the HTML string
 * representation of the tags matched by the specified `selector`.
 *
 * This function will only return the HTML string for the first tag
 * matched by the selector. To match every tag, use `htmls`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const html = (selector: Selector): Scraper<string> =>
  pipe(RO.asks(S.select(selector)), RO.chain(withFirst(tagsToHtml)))

/**
 * The `htmls` combinator takes a `Selector` and returns the HTML string
 * representation of every set of tags (possibly nested) matched by the
 * specified `selector`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const htmls = (selector: Selector): Scraper<ReadonlyArray<string>> =>
  pipe(RO.asks(S.select(selector)), RO.chain(withAll(tagsToHtml)))

/**
 * The `innerHTML` combinator takes a `Selector` and returns the inner HTML
 * string representation of the tags matched by the specified `selector`.
 * In this case, *inner html* refers to the set of tags within, but not
 * including, the selected tags.
 *
 * This function will only return the HTML string for the first tag matched
 * by the selector. To match every tag, use `innerHTMLs`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const innerHTML = (selector: Selector): Scraper<string> =>
  pipe(RO.asks(S.select(selector)), RO.chain(withFirst(tagsToInnerHTML)))

/**
 * The `innerHTMLs` combinator takes a `Selector` and returns the inner HTML
 * string representation of every set of tags (possibly nested) matched by
 * the specified `selector`. In this case, *inner html* refers to the set of
 * tags within, but not including, the selected tags.
 *
 * @category combinators
 * @since 0.0.1
 */
export const innerHTMLs = (selector: Selector): Scraper<ReadonlyArray<string>> =>
  pipe(RO.asks(S.select(selector)), RO.chain(withAll(tagsToInnerHTML)))

/**
 * The `position` combinator is designed to be used to extract the position
 * of each HTML tag within the currently matched subtree. It is primarily
 * intended to be used in combination with the `chroots` combinator and the
 * `do`-notation helpers.
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
 * ```typescript
 * import { pipe } from 'fp-ts/function'
 * import * as S from 'scalpel-ts/Scraper'
 * import * as Select from 'scalpel-ts/Select'
 *
 * S.scrape(
 *   pipe(
 *     S.position,
 *     S.bindTo('index'),
 *     S.bind('content', () => S.texts(Select.tag('p'))),
 *     S.chroots(pipe(Select.tag('article'), Select.nested(Select.tag('p'))))
 *   )
 * )
 * // [
 * //   { index: 0, content: [ 'First paragraph.' ] },
 * //   { index: 1, content: [ 'Second paragraph.' ] },
 * //   { index: 2, content: [ 'Third paragraph.' ] }
 * // ]
 * ```
 *
 * @category combinators
 * @since 0.0.1
 */
export const position: Scraper<number> = RO.asks((spec) => tagsToPosition(spec))

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * The `scrape` function executes a `Scraper` on a stream of `Token`s and produces
 * an optional value of type `A`.
 *
 * @category utils
 * @since 0.0.1
 */
export const scrape = <A>(scraper: Scraper<A>): ((tags: ReadonlyArray<T.Token>) => Option<A>) =>
  flow(TS.tagsToSpec, scrapeTagSpec(scraper))

/**
 * A convenience method to "run" the `Scraper`.
 */
const scrapeTagSpec = <A>(scraper: Scraper<A>) => (tagSpec: TagSpec): Option<A> => scraper(tagSpec)

/**
 * Takes a function which maps over the results of a `Selection` and returns the
 * first result as a `Scraper`.
 */
const withFirst = <A, B>(f: (a: A) => B): ((as: ReadonlyArray<A>) => Scraper<B>) =>
  flow(RA.head, O.map(f), RO.fromOption)

/**
 * Takes a function which maps over the results of a `Selection` and returns the
 * first result as a `Scraper`.
 */
const withAll = <A, B>(f: (a: A) => B): ((as: ReadonlyArray<A>) => Scraper<ReadonlyArray<B>>) =>
  RA.traverse(RO.Applicative)(flow(f, RO.some))

/**
 * Takes a function which maps over the tokens in a `TagSpec` and combines them
 * using the specified `Monoid`.
 */
const foldSpec = <B>(M: M.Monoid<B>) => (f: (a: T.Token) => B) => (spec: TagSpec): B =>
  pipe(
    spec.tags,
    RA.foldMap(M)((info) => f(info.token))
  )

/**
 * Maps over the tokens in a `TagSpec` returning the text from `ContentText`
 * and `ContentChar` tokens.
 */
const tagsToText: (spec: TagSpec) => string = foldSpec(M.monoidString)(
  T.fold({
    TagOpen: () => M.monoidString.empty,
    TagClose: () => M.monoidString.empty,
    Text: identity,
    Comment: () => M.monoidString.empty
  })
)

/**
 * Returns the value of the first attribute matching the specified `key`,
 * if present.
 */
const getAttribute = (key: string): ((attributes: ReadonlyArray<Attribute>) => Option<string>) =>
  flow(
    RA.filterMap((attr) => (attr.key === key ? O.some(attr.value) : O.none)),
    RA.head
  )

/**
 * Maps over the tokens in a `TagSpec` returning the value of the first attribute
 * that matches the specified `key` on each token, if present.
 */
const tagsToAttr = (key: string) => ({ tags }: TagSpec): Option<string> =>
  pipe(
    tags,
    RA.findFirstMap(({ token }) =>
      pipe(
        token,
        T.fold({
          TagOpen: (_, attrs) => pipe(attrs, getAttribute(key)),
          TagClose: () => O.none,
          Text: () => O.none,
          Comment: () => O.none
        })
      )
    )
  )

/**
 * Maps over the tokens in a `TagSpec` returning a HTML string representation of the
 * token stream.
 */
const tagsToHtml: (spec: TagSpec) => string = foldSpec(M.monoidString)(T.showToken.show)

/**
 * Maps over the tokens in a `TagSpec` returning a HTML string representation of the
 * inner HTML for each token in the stream. In this case, *inner html* refers to the
 * set of tags within, but not including, the selected tags.
 */
const tagsToInnerHTML: (spec: TagSpec) => string = (spec) => {
  const len = spec.tags.length
  return len < 2 ? M.monoidString.empty : tagsToHtml({ ...spec, tags: spec.tags.slice(1, len - 1) })
}

/**
 * Maps a `TagSpec` into its corresponding position within the matched HTML document.
 */
const tagsToPosition: (spec: TagSpec) => number = (spec) => spec.context.position
