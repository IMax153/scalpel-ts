/**
 * A `SerialScraper` allows for the application of a `Scraper` to a sequence of
 * sibling nodes. THis allows for use cases like targeting the sibling of a node,
 * or extracting a sequence of sibling nodes (e.g. paragraphs (`<p />`) under a
 * header (`<h2 />`)).
 *
 * Conceptually, serial scrapers operate on a sequence of tags that correspond
 * to the immediate children of the currently focused node. For example, given
 * the following HTML:
 *
 * ```html
 * <article>
 *   <h1>title</h1>
 *   <h2>Section 1</h2>
 *   <p>Paragraph 1.1</p>
 *   <p>Paragraph 1.2</p>
 *   <h2>Section 2</h2>
 *   <p>Paragraph 2.1</p>
 *   <p>Paragraph 2.2</p>
 * </article>
 * ```
 *
 * A serial scraper that visits the header and paragraph nodes can be executed
 * with the following:
 *
 * ```typescript
 * pipe(
 *   Serial.seekNext(Scraper.text(Select.tag('h1'))),
 *   Serial.bindTo('title'),
 *   Serial.bind('sections', () =>
 *     pipe(
 *       Serial.seekNext(Scraper.text(Select.tag('h2'))),
 *       Serial.bindTo('section'),
 *       Serial.bind('ps', () =>
 *         pipe(
 *           Serial.seekNext(Scraper.text(Select.tag('p'))),
 *           Serial.repeat,
 *           Serial.untilNext(Scraper.matches(Select.tag('h2')))
 *         )
 *       ),
 *       Serial.repeat
 *     )
 *   ),
 *   Serial.inSerial,
 *   Scraper.chroot(Select.tag('article'))
 * )
 * ```
 *
 * Each `SerialScraper` primitive follows the pattern of first moving the focus
 * backward or forward, and then extracting the content from the new focus.
 * Attempting to extract content from beyond the end of the sequence causes the
 * scraper to fail.
 *
 * To complete the above example, the article's structure and content can be
 * extracted with the following code:
 *
 * ```typescript
 *
 * ```
 *
 * While will evaluate to:
 *
 * ```sh
 * {
 *   _tag: 'Some',
 *   value: {
 *     title: 'title',
 *     sections: [
 *       {
 *         section: 'Section 1',
 *         ps: [ 'Paragraph 1.1', 'Paragraph 1.2' ]
 *       },
 *       {
 *         section: 'Section 2',
 *         ps: [ 'Paragraph 2.1', 'Paragraph 2.2' ]
 *       }
 *     ]
 *   }
 * ```
 *
 *
 * @since 0.0.1
 */
import type { Alt1 } from 'fp-ts/lib/Alt'
import type { Alternative1 } from 'fp-ts/lib/Alternative'
import type { Applicative1 } from 'fp-ts/lib/Applicative'
import type { Apply1 } from 'fp-ts/lib/Apply'
import type { Functor1 } from 'fp-ts/lib/Functor'
import type { Monad1 } from 'fp-ts/lib/Monad'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as S from 'fp-ts/State'
import * as T from 'fp-ts/Tuple'
import { flow, identity, pipe, Endomorphism, Lazy } from 'fp-ts/function'
import * as Z from 'fp-ts-contrib/Zipper'

import { TagSpec } from './Types/TagSpec'
import type { Scraper } from './Scraper'

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Serial scrapers operate on a zipper of `TagSpec`s that correspond to the root
 * nodes and siblings in a document.
 *
 * Access to the ziper is always performed in
 * move-the-read manner. For this reason, it is valid for the current focus of the
 * zipper to be just off either end of the list such that moving forward or backward
 * would result in reading the first or last node.
 *
 * These valid focuses are expressed as `None` values at either end of the zipper,
 * since they are valid positions for the focus to pass over but not valid positions
 * for the focus to read.
 *
 * @category model
 * @since 0.0.1
 */
export type SpecZipper = Z.Zipper<O.Option<TagSpec>>

/**
 * Represents a `Scraper` that is able to be applied to a sequence of sibling nodes.
 *
 * @category model
 * @since 0.0.1
 */
export type SerialScraper<A> = S.State<SpecZipper, O.Option<A>>

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const none: SerialScraper<never> = S.of(O.none)

/**
 * @category constructors
 * @since 0.0.1
 */
export const some: <A>(a: A) => SerialScraper<A> = (a) => S.of(O.some(a))

/**
 * @category constructors
 * @since 0.0.1
 */
export const get: () => SerialScraper<SpecZipper> = () => (s) => [O.some(s), s]

/**
 * @category constructors
 * @since 0.0.1
 */
export const put: (s: SpecZipper) => SerialScraper<void> = (s) => () => [O.some(undefined), s]

/**
 * @category constructors
 * @since 0.0.1
 */
export const modify: (f: Endomorphism<SpecZipper>) => SerialScraper<void> = (f) => (s) => [
  O.some(undefined),
  f(s)
]

/**
 * @category constructors
 * @since 0.0.1
 */
export const gets: <A>(f: (s: SpecZipper) => A) => SerialScraper<A> = (f) => (s) => [
  O.some(f(s)),
  s
]

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromOption: <A>(ma: O.Option<A>) => SerialScraper<A> = S.of

/**
 * Constructs a `SpecZipper` from a list of `TagSpec` instances. This requires
 * bookending the zipper with `None` values to denote valid focuses that are
 * just off either end of the listdw.
 */
const zipperFromList: (specs: Array<TagSpec>) => SpecZipper = flow(
  A.reduceRight<TagSpec, SpecZipper>(Z.of(O.none), (spec, zipper) =>
    pipe(zipper, Z.insertLeft(O.some(spec)))
  ),
  Z.insertLeft<O.Option<TagSpec>>(O.none)
)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * Creates a `SpecZipper` from the current tag spec by generating a new tag spec
 * that just contains each root node in the forest.
 */
const toZipper = (spec: TagSpec): SpecZipper =>
  pipe(
    spec.hierarchy,
    A.map((f) => TagSpec(spec.context, A.of(f), spec.tokens)),
    zipperFromList
  )

/**
 * Executes a `SerialScraper` in the context of a `Scraper`. The immediate children
 * of the currently focused node are visted serially.
 *
 * @category destructors
 * @since 0.0.1
 */
export const inSerial = <A>(serialScraper: SerialScraper<A>): Scraper<A> => (spec) =>
  pipe(
    spec.hierarchy,
    RA.foldLeft(
      () => O.none,
      (root) =>
        pipe(
          serialScraper,
          spec.context.inChroot
            ? evaluate(toZipper(TagSpec(spec.context, root.forest, spec.tokens)))
            : evaluate(toZipper(spec))
        )
    )
  )

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const repeat = <A>(serialScraper: SerialScraper<A>): SerialScraper<ReadonlyArray<A>> =>
  pipe(
    repeat1(serialScraper),
    alt(() => of<ReadonlyArray<A>>(RA.empty))
  )

export const repeat1 = <A>(
  serialScraper: SerialScraper<A>
): SerialScraper<RNEA.ReadonlyNonEmptyArray<A>> =>
  pipe(
    serialScraper,
    chain((head) =>
      pipe(
        repeat(serialScraper),
        map((tail) => RNEA.cons(head, tail))
      )
    )
  )

/**
 * Moves the cursor of a `SerialScraper` using the specified `move` function.
 */
const stepWith = (move: (zipper: SpecZipper) => O.Option<SpecZipper>) => <A>(
  scraper: Scraper<A>
): SerialScraper<A> =>
  pipe(
    get(),
    chain((prev) => fromOption(move(prev))),
    bindTo('next'),
    bind('focus', ({ next }) => fromOption(next.focus)),
    bind('value', ({ focus }) => fromOption(scraper(focus))),
    chain(({ next, value }) =>
      pipe(
        put(next),
        map(() => value)
      )
    )
  )

/**
 * Moves the cursor of a `SerialScraper` using the specified `move` function.
 */
const seekWith = (move: (specZipper: SpecZipper) => O.Option<SpecZipper>) => <A>(
  scraper: Scraper<A>
): SerialScraper<A> => {
  const runScraper = (zipper: SpecZipper): SerialScraper<A> =>
    pipe(
      fromOption(zipper.focus),
      bindTo('focus'),
      bind('value', ({ focus }) => fromOption(scraper(focus))),
      chain(({ value }) =>
        pipe(
          put(zipper),
          map(() => value)
        )
      )
    )

  const go = (prev: SpecZipper): SerialScraper<A> =>
    pipe(
      fromOption(move(prev)),
      chain((next) =>
        pipe(
          runScraper(next),
          alt(() => go(next))
        )
      )
    )

  return pipe(get(), chain(go))
}

/**
 * Creates a new serial context by moving the focus of the `SerialScraper`
 * using the specified `move` function and and collecting nodes into a
 * `SpecZipper` using the specified `appendNode` function until the specified
 * `until` `Scraper` is matched by the focused node.
 */
const untilWith = (
  move: (specZipper: SpecZipper) => O.Option<SpecZipper>,
  appendNode: (spec: O.Option<TagSpec>) => (specZipper: SpecZipper) => SpecZipper
) => <A>(until: Scraper<A>) => <B>(scraper: SerialScraper<B>): SerialScraper<B> => {
  const split = (prev: SpecZipper): SerialScraper<SpecZipper> =>
    pipe(
      fromOption(move(prev)),
      bindTo('next'),
      bind('spec', ({ next }) => fromOption(next.focus)),
      chain(({ next, spec }) =>
        pipe(
          until(spec),
          fromOption,
          map(() => Z.of<O.Option<TagSpec>>(O.none)),
          alt(() => pipe(split(next), map(appendNode(O.some(spec)))))
        )
      ),
      alt(() => of(Z.of<O.Option<TagSpec>>(O.none)))
    )

  return pipe(
    get(),
    chain(split),
    chain((inner) => pipe(scraper, evaluate(appendNode(O.none)(inner)), fromOption))
  )
}

/**
 * Moves the cursor of the `SerialScraper` back one node and execute the specified
 * `scraper` on the newly focused node.
 *
 * @category combinators
 * @since 0.0.1
 */
export const stepBack: <A>(scraper: Scraper<A>) => SerialScraper<A> = stepWith(Z.up)

/**
 * Moves the cursor of the `SerialScraper` forward one node and execute the specified
 * `scraper` on the newly focused node.
 *
 * @category combinators
 * @since 0.0.1
 */
export const stepNext: <A>(scraper: Scraper<A>) => SerialScraper<A> = stepWith(Z.down)

/**
 * Moves the cursor of the `SerialScraper` backward until the specified `scraper`
 * is successfully able to execute on the focused node. If the scraper is never
 * successful, then the `SerialScraper` will fail.
 *
 * @category combinators
 * @since 0.0.1
 */
export const seekBack: <A>(scraper: Scraper<A>) => SerialScraper<A> = seekWith(Z.up)

/**
 * Moves the cursor of the `SerialScraper` forward until the specified `scraper`
 * is successfully able to execute on the focused node. If the scraper is never
 * successful, then the `SerialScraper` will fail.
 *
 * @category combinators
 * @since 0.0.1
 */
export const seekNext: <A>(scraper: Scraper<A>) => SerialScraper<A> = seekWith(Z.down)

/**
 * Creates a new serial context by moving the focus of the `SerialScraper`
 * backward and collecting nodes until the specified `scraper` matches the
 * focused node. The `SerialScraper` is then executed on the collected nodes.
 *
 * @category combinators
 * @since 0.0.1
 */
export const untilBack: <A>(
  until: Scraper<A>
) => <B>(scraper: SerialScraper<B>) => SerialScraper<B> = untilWith(Z.up, Z.insertRight)

/**
 * Creates a new serial context by moving the focus of the `SerialScraper`
 * forward and collecting nodes until the specified `scraper` matches the
 * focused node. The `SerialScraper` is then executed on the collected nodes.
 *
 * The specified `scraper` is unable to see nodes outside the new restricted
 * context.
 *
 * @category combinators
 * @since 0.0.1
 */
export const untilNext: <A>(
  until: Scraper<A>
) => <B>(scraper: SerialScraper<B>) => SerialScraper<B> = untilWith(Z.down, Z.insertLeft)

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const map_: Functor1<URI>['map'] = (fa, f) => pipe(fa, map(f))
const ap_: Apply1<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))
const chain_: Monad1<URI>['chain'] = (ma, f) => pipe(ma, chain(f))
const alt_: Alternative1<URI>['alt'] = (fa, that) => pipe(fa, alt(that))

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @category Functor
 * @since 0.0.1
 */
export const map: <A, B>(f: (a: A) => B) => (fa: SerialScraper<A>) => SerialScraper<B> = (f) =>
  S.map(O.map(f))

/**
 * @category Apply
 * @since 0.0.1
 */
export const ap = <A>(
  fa: SerialScraper<A>
): (<B>(fab: SerialScraper<(a: A) => B>) => SerialScraper<B>) =>
  flow(
    S.map((gab) => (ga: O.Option<A>) => O.ap(ga)(gab)),
    S.ap(fa)
  )

/**
 * @category Apply
 * @since 0.1.18
 */
export const apFirst = <B>(fb: SerialScraper<B>): (<A>(fa: SerialScraper<A>) => SerialScraper<A>) =>
  flow(
    map((a) => () => a),
    ap(fb)
  )

/**
 * @category Apply
 * @since 0.1.18
 */
export const apSecond = <B>(
  fb: SerialScraper<B>
): (<A>(fa: SerialScraper<A>) => SerialScraper<B>) =>
  flow(
    map(() => (b: B) => b),
    ap(fb)
  )

/**
 * @category Monad
 * @since 0.0.1
 */
export const chain = <A, B>(f: (a: A) => SerialScraper<B>) => (
  ma: SerialScraper<A>
): SerialScraper<B> => pipe(ma, S.chain(O.fold<A, SerialScraper<B>>(() => none, f)))

/**
 * @category Applicative
 * @since 0.0.1
 */
export const of: Applicative1<URI>['of'] = some

/**
 * @category Monad
 * @since 0.0.1
 */
export const chainFirst: <A, B>(
  f: (a: A) => SerialScraper<B>
) => (ma: SerialScraper<A>) => SerialScraper<A> = (f) =>
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
export const flatten: <A>(mma: SerialScraper<SerialScraper<A>>) => SerialScraper<A> =
  /* #__PURE__ */
  chain(identity)

/**
 * @category Alternative
 * @since 0.0.1
 */
export const alt: <A>(
  that: Lazy<SerialScraper<A>>
) => (fa: SerialScraper<A>) => SerialScraper<A> = (that) => S.chain(O.fold(that, some))

/**
 * @category Alternative
 * @since 0.0.1
 */
export const zero: Alternative1<URI>['zero'] = () => none

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.0.1
 */
export const URI = 'SerialScraper'

/**
 * @category instances
 * @since 0.0.1
 */
export type URI = typeof URI

declare module 'fp-ts/HKT' {
  interface URItoKind<A> {
    readonly [URI]: SerialScraper<A>
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

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * @since 0.0.1
 */
export const evaluate: (s: SpecZipper) => <A>(ma: SerialScraper<A>) => O.Option<A> = (s) => (ma) =>
  T.fst(ma(s))

/**
 * @since 0.0.1
 */
export const execute: (s: SpecZipper) => <A>(ma: SerialScraper<A>) => SpecZipper = (s) => (ma) =>
  T.snd(ma(s))

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @category do notation
 * @since 0.0.1
 */
export const bindTo = <N extends string>(
  name: N
): (<A>(fa: SerialScraper<A>) => SerialScraper<{ [K in N]: A }>) =>
  map((b) => ({ [name]: b } as any))

/**
 * @category do notation
 * @since 0.0.1
 */
export const bind = <N extends string, A, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => SerialScraper<B>
): ((
  fa: SerialScraper<A>
) => SerialScraper<{ [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
  chain((a) =>
    pipe(
      f(a),
      map((b) => ({ ...a, [name]: b } as any))
    )
  )
