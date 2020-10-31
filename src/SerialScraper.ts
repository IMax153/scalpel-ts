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
 * import { pipe } from 'fp-ts/function'
 * import * as S from 'scalpel-ts/Scraper'
 * import * as Select from 'scalpel-ts/Select'
 * import * as Serial from 'scalpel-ts/SerialScraper'
 *
 * pipe(
 *   Serial.seekNext(S.text(Select.tag('h1'))),
 *   Serial.bindTo('title'),
 *   Serial.bind('sections', () =>
 *     pipe(
 *       Serial.seekNext(S.text(Select.tag('h2'))),
 *       Serial.bindTo('section'),
 *       Serial.bind('ps', () =>
 *         pipe(
 *           Serial.seekNext(S.text(Select.tag('p'))),
 *           Serial.repeat,
 *           Serial.untilNext(S.matches(Select.tag('h2')))
 *         )
 *       ),
 *       Serial.repeat
 *     )
 *   ),
 *   Serial.inSerial,
 *   S.chroot(Select.tag('article'))
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
 * @since 0.0.1
 */
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import * as Z from 'fp-ts-contrib/Zipper'

import type { Scraper } from './Scraper'
import * as SO from './Internal/StateOption'
import { TagSpec } from './Internal/Tag/TagSpec'

export * from './Internal/StateOption'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Option = O.Option
import StateOption = SO.StateOption

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
export type SpecZipper = Z.Zipper<Option<TagSpec>>

/**
 * Represents a `Scraper` that is able to be applied to a sequence of sibling nodes.
 *
 * @category model
 * @since 0.0.1
 */
export type SerialScraper<A> = StateOption<SpecZipper, A>

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * Constructs a `SpecZipper` from a list of `TagSpec` instances. This requires
 * bookending the zipper with `None` values to denote valid focuses that are
 * just off either end of the listdw.
 */
const zipperFromList: (specs: Array<TagSpec>) => SpecZipper = flow(
  A.reduceRight<TagSpec, SpecZipper>(Z.of(O.none), (spec, zipper) =>
    pipe(zipper, Z.insertLeft(O.some(spec)))
  ),
  Z.insertLeft<Option<TagSpec>>(O.none)
)

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
            ? SO.evaluate(toZipper(TagSpec(spec.context, root.forest, spec.tokens)))
            : SO.evaluate(toZipper(spec))
        )
    )
  )

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const repeat = <A>(serialScraper: SerialScraper<A>): SerialScraper<ReadonlyArray<A>> =>
  pipe(
    repeat1(serialScraper),
    SO.alt(() => SO.of<SpecZipper, ReadonlyArray<A>>(RA.empty))
  )

export const repeat1 = <A>(
  serialScraper: SerialScraper<A>
): SerialScraper<RNEA.ReadonlyNonEmptyArray<A>> =>
  pipe(
    serialScraper,
    SO.chain((head) =>
      pipe(
        repeat(serialScraper),
        SO.map((tail) => RNEA.cons(head, tail))
      )
    )
  )

/**
 * Moves the cursor of a `SerialScraper` using the specified `move` function.
 */
const stepWith = (move: (zipper: SpecZipper) => Option<SpecZipper>) => <A>(
  scraper: Scraper<A>
): SerialScraper<A> =>
  pipe(
    SO.get<SpecZipper>(),
    SO.chainOptionK(move),
    SO.bindTo('next'),
    SO.bind('focus', ({ next }) => SO.fromOption(next.focus)),
    SO.bind('value', ({ focus }) => SO.fromOption(scraper(focus))),
    SO.chain(({ next, value }) =>
      pipe(
        SO.put(next),
        SO.map(() => value)
      )
    )
  )

/**
 * Moves the cursor of a `SerialScraper` using the specified `move` function.
 */
const seekWith = (move: (specZipper: SpecZipper) => Option<SpecZipper>) => <A>(
  scraper: Scraper<A>
): SerialScraper<A> => {
  const runScraper = (zipper: SpecZipper): SerialScraper<A> =>
    pipe(
      SO.get<SpecZipper>(),
      SO.chain((curr) => SO.fromOption(curr.focus)),
      SO.bindTo('focus'),
      SO.bind('value', ({ focus }) => SO.fromOption(scraper(focus))),
      SO.chain(({ value }) =>
        pipe(
          SO.put(zipper),
          SO.map(() => value)
        )
      )
    )

  const go = (prev: SpecZipper): SerialScraper<A> =>
    pipe(
      SO.get<SpecZipper>(),
      SO.chainOptionK(() => move(prev)),
      SO.chain((next) =>
        pipe(
          runScraper(next),
          SO.alt(() => go(next))
        )
      )
    )

  return pipe(SO.get<SpecZipper>(), SO.chain(go))
}

/**
 * Creates a new serial context by moving the focus of the `SerialScraper`
 * using the specified `move` function and and collecting nodes into a
 * `SpecZipper` using the specified `appendNode` function until the specified
 * `until` `Scraper` is matched by the focused node.
 */
const untilWith = (
  move: (specZipper: SpecZipper) => Option<SpecZipper>,
  appendNode: (spec: Option<TagSpec>) => (specZipper: SpecZipper) => SpecZipper
) => <A>(until: Scraper<A>) => <B>(scraper: SerialScraper<B>): SerialScraper<B> => {
  const split = (prev: SpecZipper): SerialScraper<SpecZipper> =>
    pipe(
      SO.get<SpecZipper>(),
      SO.chainOptionK(() => move(prev)),
      SO.bindTo('next'),
      SO.bind('spec', ({ next }) => SO.fromOption(next.focus)),
      SO.chain(({ next, spec }) =>
        pipe(
          SO.get<SpecZipper>(),
          SO.chainOptionK(() => until(spec)),
          SO.map(() => Z.of<Option<TagSpec>>(O.none)),
          SO.alt(() => pipe(split(next), SO.map(appendNode(O.some(spec)))))
        )
      ),
      SO.alt(() => SO.of(Z.of<Option<TagSpec>>(O.none)))
    )

  return pipe(
    SO.get<SpecZipper>(),
    SO.chain(split),
    SO.chainOptionK((inner) => pipe(scraper, SO.evaluate(appendNode(O.none)(inner))))
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
