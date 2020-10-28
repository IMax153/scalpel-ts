import type { Alt1 } from 'fp-ts/Alt'
import type { Alternative1 } from 'fp-ts/Alternative'
import type { Applicative1 } from 'fp-ts/Applicative'
import type { Apply1 } from 'fp-ts/Apply'
import type { Compactable1, Separated } from 'fp-ts/Compactable'
import type { Either } from 'fp-ts/Either'
import type { Filter1, Filterable1, Partition1 } from 'fp-ts/Filterable'
import type { Functor1 } from 'fp-ts/Functor'
import type { Monad1 } from 'fp-ts/Monad'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, identity, not, pipe, Lazy, Predicate, Refinement } from 'fp-ts/function'

import * as T from './Html/Token'
import { select, Selector } from './Select'
import { tokensToSpec, TagSpec } from './Types/TagSpec'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.0.1
 */
export type Scraper<A> = R.Reader<TagSpec, O.Option<A>>

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const none: Scraper<never> =
  /* #__PURE__ */
  R.of(O.none)

/**
 * @category constructors
 * @since 0.0.1
 */
export const some: <A>(a: A) => Scraper<A> =
  /* #__PURE__ */
  flow(O.some, R.of)

/**
 * @category constructors
 * @since 0.0.1
 */
export const ask: () => Scraper<TagSpec> = () => O.of

/**
 * @category constructors
 * @since 0.0.1
 */
export const asks: <A>(f: (r: TagSpec) => A) => Scraper<A> = (f) => flow(f, O.some)

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromOption: <A>(ma: O.Option<A>) => Scraper<A> =
  /* #__PURE__ */
  R.of

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromReader: <A>(ma: R.Reader<TagSpec, A>) => Scraper<A> =
  /* #__PURE__ */
  R.map(O.of)

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Scraper<A>
  <A>(predicate: Predicate<A>): (a: A) => Scraper<A>
} = <A>(predicate: Predicate<A>) => (a: A) => (predicate(a) ? some(a) : none)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.0.1
 */
export const fold: <A, B>(
  onNone: Lazy<R.Reader<TagSpec, B>>,
  onSome: (a: A) => R.Reader<TagSpec, B>
) => (ma: Scraper<A>) => R.Reader<TagSpec, B> =
  /* #__PURE__ */
  flow(O.fold, R.chain)

/**
 * @category destructors
 * @since 0.0.1
 */
export const getOrElseW = <B>(onNone: Lazy<R.Reader<TagSpec, B>>) => <A>(
  ma: Scraper<A>
): R.Reader<TagSpec, A | B> => pipe(ma, R.chain(O.fold<A, R.Reader<TagSpec, A | B>>(onNone, R.of)))

/**
 * @category destructors
 * @since 0.0.1
 */
export const getOrElse: <A>(
  onNone: Lazy<R.Reader<TagSpec, A>>
) => <A>(ma: Scraper<A>) => R.Reader<TagSpec, A> = getOrElseW as any

/**
 * The `scrape` function executes a `Scraper` on a stream of `Token`s and produces
 * an optional value of type `A`.
 *
 * @category utils
 * @since 0.0.1
 */
export const scrape = <A>(scraper: Scraper<A>): ((tags: ReadonlyArray<T.Token>) => O.Option<A>) =>
  flow(T.canonicalizeTokens, tokensToSpec, scrapeTagSpec(scraper))

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
  pipe(
    ask(),
    map((spec) => pipe(spec, select(selector), RA.map(scraper), RA.compact))
  )

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
  flow(chroots(selector), chain(flow(RA.head, fromOption)))

/**
 * The `matches` combinator takes a `Selector` and returns `true` if the specified
 * `selector` matches any node in the DOM, otherwise it returns `false`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const matches = (selector: Selector): Scraper<ReadonlyArray<TagSpec>> =>
  pipe(asks(select(selector)), chain(fromPredicate(not(RA.isEmpty))))

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
  pipe(asks(select(selector)), chain(withFirst(tagsToText)))

/**
 * The `text` combinator takes a `Selector` and returns the inner text from
 * every set of tags (possibly nested) matched by the specified `selector`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const texts = (selector: Selector): Scraper<ReadonlyArray<string>> =>
  pipe(asks(select(selector)), chain(withAll(tagsToText)))

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
  flow(asks(select(selector)), O.chain(flow(RA.map(tagsToAttr(key)), RA.compact, RA.head)))

/**
 * The `attrs` combinator takes an attribute `key` and a `Selector` and
 * returns the value of the attribute with the specified `key` for every
 * opening tag (possibly nested) that matches the specified `selector`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const attrs = (key: string, selector: Selector): Scraper<ReadonlyArray<string>> =>
  flow(asks(select(selector)), O.map(flow(RA.map(tagsToAttr(key)), RA.compact)))

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
  pipe(asks(select(selector)), chain(withFirst(tagsToHtml)))

/**
 * The `htmls` combinator takes a `Selector` and returns the HTML string
 * representation of every set of tags (possibly nested) matched by the
 * specified `selector`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const htmls = (selector: Selector): Scraper<ReadonlyArray<string>> =>
  pipe(asks(select(selector)), chain(withAll(tagsToHtml)))

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
  pipe(asks(select(selector)), chain(withFirst(tagsToInnerHTML)))

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
  pipe(asks(select(selector)), chain(withAll(tagsToInnerHTML)))

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
 * import * as Scraper from 'scalpel-ts/Scraper'
 * import * as Select from 'scalpel-ts/Select'
 *
 * Scraper.scrape(
 *   pipe(
 *     Scraper.position,
 *     Scraper.bindTo('index'),
 *     Scraper.bind('content', () => Scraper.texts(Select.tag('p'))),
 *     Scraper.chroots(pipe(Select.tag('article'), Select.nested(Select.tag('p'))))
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
export const position: Scraper<number> = asks((spec) => tagsToPosition(spec))

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const map_: Functor1<URI>['map'] = (fa, f) => pipe(fa, map(f))
const ap_: Apply1<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))
const chain_: Monad1<URI>['chain'] = (ma, f) => pipe(ma, chain(f))
const alt_: Alternative1<URI>['alt'] = (fa, that) => pipe(fa, alt(that))
const filter_: Filter1<URI> = <A>(fa: Scraper<A>, f: Predicate<A>): Scraper<A> =>
  pipe(fa, filter(f))
const filterMap_: Filterable1<URI>['filterMap'] = (fa, f) => pipe(fa, filterMap(f))
const partition_: Partition1<URI> = <A>(
  fa: Scraper<A>,
  f: Predicate<A>
): Separated<Scraper<A>, Scraper<A>> => pipe(fa, partition(f))
const partitionMap_: Filterable1<URI>['partitionMap'] = (fa, f) => pipe(fa, partitionMap(f))

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @category Functor
 * @since 0.0.1
 */
export const map: <A, B>(f: (a: A) => B) => (fa: Scraper<A>) => Scraper<B> = (f) => R.map(O.map(f))

/**
 * @category Apply
 * @since 0.0.1
 */
export const ap = <A>(fa: Scraper<A>): (<B>(fab: Scraper<(a: A) => B>) => Scraper<B>) =>
  flow(
    R.map((gab) => (ga: O.Option<A>) => O.ap(ga)(gab)),
    R.ap(fa)
  )

/**
 * @category Apply
 * @since 0.1.18
 */
export const apFirst = <B>(fb: Scraper<B>): (<A>(fa: Scraper<A>) => Scraper<A>) =>
  flow(
    map((a) => () => a),
    ap(fb)
  )

/**
 * @category Apply
 * @since 0.1.18
 */
export const apSecond = <B>(fb: Scraper<B>): (<A>(fa: Scraper<A>) => Scraper<B>) =>
  flow(
    map(() => (b: B) => b),
    ap(fb)
  )

/**
 * @category Monad
 * @since 0.0.1
 */
export const chain = <A, B>(f: (a: A) => Scraper<B>) => (ma: Scraper<A>): Scraper<B> =>
  pipe(ma, R.chain(O.fold<A, Scraper<B>>(() => none, f)))

/**
 * @category Applicative
 * @since 0.0.1
 */
export const of: Applicative1<URI>['of'] = some

/**
 * @category Monad
 * @since 0.0.1
 */
export const chainFirst: <A, B>(f: (a: A) => Scraper<B>) => (ma: Scraper<A>) => Scraper<A> = (f) =>
  chain((a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )

/**
 * @category Monad
 * @since 0.0.1
 */
export const flatten: <A>(mma: Scraper<Scraper<A>>) => Scraper<A> =
  /* #__PURE__ */
  chain(identity)

/**
 * @category Alternative
 * @since 0.0.1
 */
export const alt: <A>(that: Lazy<Scraper<A>>) => (fa: Scraper<A>) => Scraper<A> = (that) =>
  R.chain(O.fold(that, some))

/**
 * @category Alternative
 * @since 0.0.1
 */
export const zero: Alternative1<URI>['zero'] = () => none

/**
 * @category Compactable
 * @since 0.0.1
 */
export const compact: <A>(fa: Scraper<O.Option<A>>) => Scraper<A> = R.map(O.compact)

/**
 * @category Compactable
 * @since 0.0.1
 */
export const separate: <A, B>(ma: Scraper<Either<A, B>>) => Separated<Scraper<A>, Scraper<B>> = (
  ma
) => {
  const left = pipe(ma, map(O.getLeft), compact)
  const right = pipe(ma, map(O.getRight), compact)
  return { left, right }
}
/**
 * @category Filterable
 * @since 0.0.1
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: Scraper<A>) => Scraper<B>
  <A>(predicate: Predicate<A>): (fa: Scraper<A>) => Scraper<A>
} = <A>(f: Predicate<A>) => (fa: Scraper<A>): Scraper<A> => pipe(fa, R.map(O.filter(f)))

/**
 * @category Filterable
 * @since 0.0.1
 */
export const filterMap: <A, B>(f: (a: A) => O.Option<B>) => (fa: Scraper<A>) => Scraper<B> = (
  f
) => (fa) => pipe(fa, R.map(O.filterMap(f)))

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Scraper<A>
  ) => Separated<Scraper<A>, Scraper<B>>
  <A>(predicate: Predicate<A>): (fa: Scraper<A>) => Separated<Scraper<A>, Scraper<A>>
} = <A>(f: Predicate<A>) => (fa: Scraper<A>): Separated<Scraper<A>, Scraper<A>> => {
  const left = pipe(fa, filter(not(f)))
  const right = pipe(fa, filter(f))
  return { left, right }
}

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: Scraper<A>) => Separated<Scraper<B>, Scraper<C>> = (f) => (fa) => {
  const left = pipe(fa, filterMap(flow(f, O.getLeft)))
  const right = pipe(fa, filterMap(flow(f, O.getRight)))
  return { left, right }
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.0.1
 */
export const URI = 'Scraper'

/**
 * @category instances
 * @since 0.0.1
 */
export type URI = typeof URI

declare module 'fp-ts/HKT' {
  interface URItoKind<A> {
    readonly [URI]: Scraper<A>
  }
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Functor: Functor1<URI> = {
  URI,
  map: map_
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Apply: Apply1<URI> = {
  URI,
  map: map_,
  ap: ap_
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Applicative: Applicative1<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Monad: Monad1<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of,
  chain: chain_
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Alt: Alt1<URI> = {
  URI,
  map: map_,
  alt: alt_
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Alternative: Alternative1<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of,
  alt: alt_,
  zero
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Compactable: Compactable1<URI> = {
  URI,
  compact,
  separate
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Filterable: Filterable1<URI> = {
  URI,
  map: map_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_
}

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @category do notation
 * @since 0.0.1
 */
export const bindTo = <N extends string>(
  name: N
): (<A>(fa: Scraper<A>) => Scraper<{ [K in N]: A }>) => map((b) => ({ [name]: b } as any))

/**
 * @category do notation
 * @since 0.0.1
 */
export const bind = <N extends string, A, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => Scraper<B>
): ((fa: Scraper<A>) => Scraper<{ [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
  chain((a) =>
    pipe(
      f(a),
      map((b) => ({ ...a, [name]: b } as any))
    )
  )

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * A convenience method to "run" the `Scraper`.
 */
const scrapeTagSpec = <A>(scraper: Scraper<A>) => (tagSpec: TagSpec): O.Option<A> =>
  scraper(tagSpec)

/**
 * Takes a function which maps over the results of a `Selection` and returns the
 * first result as a `Scraper`.
 */
const withFirst = <A, B>(f: (a: A) => B): ((as: ReadonlyArray<A>) => Scraper<B>) =>
  flow(RA.head, O.map(f), fromOption)

/**
 * Takes a function which maps over the results of a `Selection` and returns the
 * first result as a `Scraper`.
 */
const withAll = <A, B>(f: (a: A) => B): ((as: ReadonlyArray<A>) => Scraper<ReadonlyArray<B>>) =>
  RA.traverse(Applicative)(flow(f, some))

/**
 * Takes a function which maps over the tokens in a `TagSpec` and combines them
 * using the specified `Monoid`.
 */
const foldSpec = <B>(M: M.Monoid<B>) => (f: (a: T.Token) => B) => (spec: TagSpec): B =>
  pipe(
    spec.tokens,
    RA.foldMap(M)((info) => f(info.token))
  )

/**
 * Maps over the tokens in a `TagSpec` returning the text from `ContentText`
 * and `ContentChar` tokens.
 */
const tagsToText: (spec: TagSpec) => string = foldSpec(M.monoidString)(
  T.fold({
    TagOpen: () => M.monoidString.empty,
    TagSelfClose: () => M.monoidString.empty,
    TagClose: () => M.monoidString.empty,
    ContentText: (text) => text,
    ContentChar: (char) => char,
    Comment: () => M.monoidString.empty,
    Doctype: () => M.monoidString.empty
  })
)

/**
 * Returns the value of the first attribute matching the specified `key`,
 * if present.
 */
const getAttribute = (
  key: string
): ((attributes: ReadonlyArray<T.Attribute>) => O.Option<string>) =>
  flow(
    RA.filterMap((attr) => (attr.key === key ? O.some(attr.value) : O.none)),
    RA.head
  )

/**
 * Maps over the tokens in a `TagSpec` returning the value of the first attribute
 * that matches the specified `key` on each token, if present.
 */
const tagsToAttr = (key: string): ((spec: TagSpec) => O.Option<string>) =>
  foldSpec(O.getMonoid(M.monoidString))(
    T.fold({
      TagOpen: (_, attrs) => pipe(attrs, getAttribute(key)),
      TagSelfClose: (_, attrs) => pipe(attrs, getAttribute(key)),
      TagClose: () => O.none,
      ContentText: () => O.none,
      ContentChar: () => O.none,
      Comment: () => O.none,
      Doctype: () => O.none
    })
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
  const len = spec.tokens.length
  return len < 2
    ? M.monoidString.empty
    : tagsToHtml({ ...spec, tokens: spec.tokens.slice(1, len - 2) })
}

/**
 * Maps a `TagSpec` into its corresponding position within the matched HTML document.
 */
const tagsToPosition: (spec: TagSpec) => number = (spec) => spec.context.position
