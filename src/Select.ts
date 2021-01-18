/**
 * @since 0.0.1
 */
import type { Option } from 'fp-ts/Option'
import type { Tree } from 'fp-ts/Tree'
import type { Endomorphism } from 'fp-ts/function'
import * as A from 'fp-ts/Array'
import * as Eq from 'fp-ts/Eq'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as Tr from 'fp-ts/Tree'
import * as F from 'fp-ts/function'

import type { Attribute } from './Internal/Html/Tokenizer'
import type { TagForest, TagSpan } from './Internal/Tag/TagForest'
import type { TagSpec } from './Internal/Tag/TagSpec'
import type { TagInfo } from './Internal/Tag/TagInfo'
import * as T from './Internal/Html/Tokenizer'
import * as TF from './Internal/Tag/TagForest'
import * as TS from './Internal/Tag/TagSpec'
import * as MR from './Internal/MatchResult'

const foldAll = M.fold(M.monoidAll)
const foldAny = M.fold(M.monoidAny)

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents a selection of an HTML DOM tree to be operated upon by a web
 * `Scraper`. The selection includes the opening tag that matches the selection,
 * all of the inner tags, and the corresponding closing tag (if any).
 *
 * @category model
 * @since 0.0.1
 */
export type Selector = ReadonlyArray<Selection>

/**
 * Represents the strategy used for the selection of an HTML DOM tree to be
 * operated on by a `Scraper` in addition to settings associated with the
 * `Selection`.
 *
 * @category model
 * @since 0.0.1
 */
export interface Selection {
  readonly strategy: SelectStrategy
  readonly settings: SelectSettings
}

/**
 * Represents the strategy used for selection of an HTML DOM tree to be
 * operated on by a `Scraper`.
 *
 * @category model
 * @since 0.0.1
 */
export type SelectStrategy = SelectOne | SelectAny | SelectText

/**
 * Represents selection of an HTML DOM tree based upon a specific tag
 * and an optional list of `AttributePredicate`
 *
 * @category model
 * @since 0.0.1
 */
export interface SelectOne {
  readonly _tag: 'SelectOne'
  readonly tag: string
  readonly predicates: ReadonlyArray<AttributePredicate>
}

/**
 * Represents selection of any node within the HTML DOM tree (including
 * tags and bare text) which can be narrowed down by specifying a list
 * of `AttributePredicate`s that must also match a given node.
 *
 * @category model
 * @since 0.0.1
 */
export interface SelectAny {
  readonly _tag: 'SelectAny'
  readonly predicates: ReadonlyArray<AttributePredicate>
}

/**
 * Represents selection of all text nodes within the HTML DOM tree.
 *
 * @category model
 * @since 0.0.1
 */
export interface SelectText {
  readonly _tag: 'SelectText'
}

/**
 * Represents a method that takes a `Token` and returns a boolean indicating if
 * the attributes of an HTML tag match a specified predicate.
 *
 * @category model
 * @since 0.0.1
 */
export type AttributePredicate = F.Predicate<ReadonlyArray<T.Attribute>>

/**
 * Represents additional criteria for a `Selector` that must be satisfied in
 * addition to the `SelectNode`. This includes criteria that are dependent on
 * the context of the current node (e.g. the depth in relation to the previously
 * matched `SelectNode`).
 *
 * @category model
 * @since 0.0.1
 */
export interface SelectSettings {
  /**
   * The required depth of the current `SelectNode` in relation to the previously
   * matched `SelectNode`.
   */
  readonly depth: O.Option<number>
}

/**
 * Represents the ephemeral metadata that each `TagSpec` contains, which has
 * information that is not instrinsic in the subtree that corresponds with a
 * given `TagSpec`.
 *
 * @category model
 * @since 0.0.1
 */
export interface SelectContext {
  readonly position: number
  readonly inChroot: boolean
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const Selection = (strategy: SelectStrategy, settings: SelectSettings): Selection => ({
  strategy,
  settings
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const SelectOne = (
  tag: string,
  predicates: ReadonlyArray<AttributePredicate>
): SelectStrategy => ({
  _tag: 'SelectOne',
  tag,
  predicates
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const SelectAny = (predicates: ReadonlyArray<AttributePredicate>): SelectStrategy => ({
  _tag: 'SelectAny',
  predicates
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const SelectText: SelectStrategy = {
  _tag: 'SelectText'
}

/**
 * @category constructors
 * @since 0.0.1
 */
export const SelectSettings = (depth: O.Option<number>): SelectSettings => ({
  depth
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const defaultSelectSettings = SelectSettings(O.none)

/**
 * @category constructors
 * @since 0.0.1
 */
export const SelectContext = (position: number, inChroot: boolean): SelectContext => ({
  position,
  inChroot
})

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.0.1
 */
export const foldStrategy = <R>(patterns: {
  readonly SelectOne: (tag: string, predicates: ReadonlyArray<AttributePredicate>) => R
  readonly SelectAny: (predicates: ReadonlyArray<AttributePredicate>) => R
  readonly SelectText: () => R
}): ((selectNode: SelectStrategy) => R) => {
  const f = (x: SelectStrategy): R => {
    switch (x._tag) {
      case 'SelectOne':
        return patterns.SelectOne(x.tag, x.predicates)
      case 'SelectAny':
        return patterns.SelectAny(x.predicates)
      case 'SelectText':
        return patterns.SelectText()
      default:
        return F.absurd<R>(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * The `tag` combinator creates a `Selector` that will match a tag with the
 * specified `name`.
 *
 * @category constructors
 * @since 0.0.1
 */
export const tag = (name: string): Selector =>
  RA.of(Selection(SelectOne(name, RA.empty), defaultSelectSettings))

/**
 * The `any` combinator creates a `Selector` that will match any node (including
 * tags and bare text).
 *
 * @category constructors
 * @since 0.0.1
 */
export const any: Selector = RA.of(Selection(SelectAny(RA.empty), defaultSelectSettings))

/**
 * The `text` combinator creates a `Selector` that will match all text nodes.
 *
 * @category constructors
 * @since 0.0.1
 */
export const text: Selector = RA.of(Selection(SelectText, defaultSelectSettings))

/**
 * The `withAttributes` combinator creates a `Selector` by combining a tag name
 * with a list of `AttributePredicate` The resulting `Selector` will match if
 * the tags with the specified `name` and that satisfy all of the specified
 * `AttributePredicates`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const withAttributes = (
  name: string,
  predicates: ReadonlyArray<AttributePredicate>
): Selector => RA.of(Selection(SelectOne(name, predicates), defaultSelectSettings))

/**
 * The `anyWithAttributes` combinator creates a `Selector` that takes a list of
 * `AttributePredicate`s and will match any tags that satisfy all of the specified
 * `AttributePredicates`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const anyWithAttributes = (predicates: ReadonlyArray<AttributePredicate>): Selector =>
  RA.of(Selection(SelectAny(predicates), defaultSelectSettings))

const matchAttrKey: (attribute: Attribute, key: Option<string>) => boolean = (attr, key) =>
  F.pipe(
    key,
    O.fold(F.constTrue, (name) => name.toLowerCase() === attr.key.toLowerCase())
  )

/**
 * The `attribute` combinator creates an `AttributePredicate` that will match
 * attributes with the specified `key` and `value`.
 *
 * If attempting to match a specific class of a tag with potentially multiple classes,
 * use `hasClass` instead.
 *
 * @category combinators
 * @since 0.0.1
 */
export const attribute = (key: string, value: string): AttributePredicate =>
  F.flow(
    RA.map((attr) => foldAll([matchAttrKey(attr, O.some(key)), attr.value === value])),
    foldAny
  )

/**
 * The `anyAttribute` combinator creates an `AttributePredicate` that will match
 * any attributes with the specified `value`.
 *
 * If attempting to match a specific class of a tag with potentially multiple classes,
 * use `hasClass` instead.
 *
 * @category combinators
 * @since 0.0.1
 */
export const anyAttribute = (value: string): AttributePredicate =>
  F.flow(
    RA.map((attr) => foldAll([matchAttrKey(attr, O.none), attr.value === value])),
    foldAny
  )

/**
 * The `attributeRegex` combinator creates an `AttributePredicate` that will
 * match attributes with the specified `key` and whose value matches the
 * given `RegExp`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const attributeRegex = (key: string, regex: RegExp): AttributePredicate =>
  F.flow(
    RA.map((attr) => foldAll([matchAttrKey(attr, O.some(key)), regex.test(attr.value)])),
    foldAny
  )

/**
 * The `attributeRegex` combinator creates an `AttributePredicate` that will
 * match any attributes whose value matches the given `RegExp`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const anyAttributeRegex = (regex: RegExp): AttributePredicate =>
  F.flow(
    RA.map((attr) => foldAll([matchAttrKey(attr, O.none), regex.test(attr.value)])),
    foldAny
  )

/**
 * The `atDepth` combinator constrains a `Selector` to only match when it is
 * at a `depth` below the previous selector.
 *
 * In the example below, a `Selector` is created that matches anchor tags that
 * are direct children of a div tag.
 *
 * ```typescript
 * pipe(tag('div'), nested(tag('a')), atDepth(1))
 * ```
 *
 * @category combinators
 * @since 0.0.1
 */
export const atDepth = (depth: number): ((selector: Selector) => Selector) => {
  const addDepth: Endomorphism<Selector> = (selector) =>
    F.pipe(
      selector,
      RA.reduceWithIndex<Selection, Selector>(RA.empty, (i, acc, curr) =>
        i === selector.length - 1
          ? RA.snoc(acc, Selection(curr.strategy, SelectSettings(O.some(depth))))
          : RA.snoc(acc, curr)
      )
    )
  return addDepth
}

/**
 * The `nested` combinator creates a `Selector` by nesting the `child` selector
 * under the `parent` selector`.
 *
 * In the example below, a `Selector` is created that matches anchor tags nested
 * arbitrarily deep within a div tag.
 *
 * ```typescript
 * pipe(tag('div'), nested(tag('a')))
 * ```
 *
 * @category combinators
 * @since 0.0.1
 */
export const nested = (parent: Selector) => (child: Selector): Selector =>
  RA.getMonoid<Selection>().concat(child, parent)

/**
 * The classes of an HTML tag are definied as a space-separated list of characters
 * in a string designated by the `class` attribute. The `hasClass` combinator
 * creates an `AttributePredicate` that will match a `class` attribute if the
 * specified `className` appears anywhere in the space-separated list of classe
 *
 * @category combinators
 * @since 0.0.1
 */
export const hasClass = (className: string): AttributePredicate =>
  RA.foldMap(M.monoidAny)((attr) =>
    foldAll([attr.key === 'class', F.pipe(attr.value.split(' '), RA.elem(Eq.eqString)(className))])
  )

/**
 * Negates the result of an `AttributePredicate`.
 *
 * @category combinators
 * @since 0.0.1
 */
export const notP: F.Endomorphism<AttributePredicate> = F.not

/**
 * The `match` combinator allows for the creation of arbitrary `AttributePredicate`
 * The argument is a function that takes an attribute's key and value and returns
 * a boolean indicating if the attribute satisfies the predicate.
 *
 * @category combinators
 * @since 0.0.1
 */
export const match = (f: (key: string, value: string) => boolean): AttributePredicate =>
  F.flow(
    RA.map((attr) => f(attr.key, attr.value)),
    foldAny
  )

// -------------------------------------------------------------------------------------
// selectors
// -------------------------------------------------------------------------------------

/**
 * @category selectors
 * @since 0.0.1
 */
export const select = (selector: Selector) => (spec: TagSpec): ReadonlyArray<TagSpec> =>
  F.pipe(
    RA.empty,
    selectNodes(selector, spec, spec),
    RA.mapWithIndex((p, s) => TS.TagSpec(SelectContext(p, true), s.hierarchy, s.tags))
  )

const recenter = (parent: TagSpan) => (child: TagSpan): TagSpan =>
  TF.TagSpan(child.start - parent.start, child.end - parent.start)

const shrinkSpecWith = (spec: TagSpec, parent: Tree<TagSpan>): TagSpec => {
  const { start, end } = parent.value
  return TS.TagSpec(
    spec.context,
    F.pipe(parent, Tr.map(recenter(parent.value)), A.of),
    spec.tags.slice(start, end + 1)
  )
}

const updateHierarchy = (curr: TagSpec, hierarchy: TagForest): TagSpec =>
  TS.TagSpec(curr.context, hierarchy, curr.tags)

/**
 * @internal
 */
export const liftSiblings = (acc: TagForest) => (
  start: number,
  end: number
): F.Endomorphism<TagForest> =>
  A.foldLeft(
    () => acc,
    (t, ts) =>
      start < t.value.start && t.value.end < end
        ? F.pipe(ts, liftSiblings(acc)(start, end), A.cons(t))
        : end < t.value.start || t.value.end < start
        ? F.pipe(ts, liftSiblings(acc)(start, end))
        : F.pipe(ts, liftSiblings(acc)(start, end), liftSiblings(t.forest)(start, end))
  )

const selectNodes = (selectors: Selector, curr: TagSpec, root: TagSpec) => (
  acc: ReadonlyArray<TagSpec>
): ReadonlyArray<TagSpec> =>
  F.pipe(
    selectors,
    RA.foldLeft(
      () => acc,
      (n, ns) =>
        F.pipe(
          curr.hierarchy,
          A.foldLeft(
            () => acc,
            (f, fs) => {
              const { start, end } = f.value

              // At this point, there is only a single SelectNode to satisfy, so the
              // algorithm will search the remaining forests and generate a TagSpec
              // for each node that satisfies the condition
              if (RA.isEmpty(ns)) {
                return F.pipe(
                  nodeMatches(n, curr.tags[start], curr, root),
                  MR.fold({
                    MatchOk: () =>
                      F.pipe(
                        acc,
                        selectNodes([n], updateHierarchy(curr, f.forest), root),
                        selectNodes([n], updateHierarchy(curr, fs), root),
                        RA.cons(shrinkSpecWith(curr, f))
                      ),
                    MatchCull: () => F.pipe(acc, selectNodes([n], updateHierarchy(curr, fs), root)),
                    MatchFail: () =>
                      F.pipe(
                        acc,
                        selectNodes([n], updateHierarchy(curr, fs), root),
                        selectNodes([n], updateHierarchy(curr, f.forest), root)
                      )
                  })
                )
              }

              // At this point, there are still mutliple SelectNodes that need to be
              // satisfied. If the current node satisfies the condition, then the
              // current node's subforest
              // is searched for matches of the remaining SelectNode

              // In the case of a match, it is possible that there are children nested
              // within the sibling forests that are potentially valid matches for the
              // current node, despite not being direct children of the node in question.
              // This can happen with malformed HTML, for example: <a><b><c></c><a></b>.
              // In this case, <c> would be a child of <b>, which would be a sibling of
              // <a>.

              // In order to match <c>, it must be lifted out of <b>'s subforest when
              // matching <a>.
              const siblings = F.pipe(fs, liftSiblings(A.empty)(start, end))

              return F.pipe(
                nodeMatches(n, curr.tags[start], curr, root),
                MR.fold({
                  MatchOk: () =>
                    F.pipe(
                      acc,
                      selectNodes(RA.cons(n, ns), updateHierarchy(curr, fs), root),
                      selectNodes(
                        ns,
                        updateHierarchy(curr, [...f.forest, ...siblings]),
                        updateHierarchy(curr, A.cons(f, siblings))
                      )
                    ),
                  MatchCull: () =>
                    F.pipe(acc, selectNodes(RA.cons(n, ns), updateHierarchy(curr, fs), root)),
                  MatchFail: () =>
                    F.pipe(
                      acc,
                      selectNodes(RA.cons(n, ns), updateHierarchy(curr, fs), root),
                      selectNodes(RA.cons(n, ns), updateHierarchy(curr, f.forest), root)
                    )
                })
              )
            }
          )
        )
    )
  )

const checkPredicates = (
  token: T.Token,
  predicates: ReadonlyArray<AttributePredicate>
): MR.MatchResult =>
  F.pipe(
    predicates,
    RA.foldLeft(
      () =>
        F.pipe(
          token,
          T.fold({
            TagOpen: F.constTrue,
            TagClose: F.constFalse,
            Text: F.constTrue,
            Comment: F.constFalse
          }),
          MR.fromBoolean
        ),
      (x, xs) =>
        F.pipe(
          token,
          T.fold({
            TagOpen: (_, attrs) =>
              F.pipe(
                RA.cons(x, xs),
                RA.map((p) => p(attrs)),
                foldAll
              ),
            TagClose: F.constFalse,
            Text: F.constFalse,
            Comment: F.constFalse
          }),
          MR.fromBoolean
        )
    )
  )

const checkTag = (
  tagName: string,
  predicates: ReadonlyArray<AttributePredicate>,
  { token }: TagInfo
): MR.MatchResult => {
  const x = checkPredicates(token, predicates)
  const y = F.pipe(
    token,
    T.fold({
      TagOpen: (name) => Eq.eqString.equals(tagName.toLowerCase(), name.toLowerCase()),
      TagClose: F.constFalse,
      Text: F.constFalse,
      Comment: F.constFalse
    }),
    MR.fromBoolean
  )
  return MR.semigroupMatchResult.concat(x, y)
}

/**
 * Give an instance of `SelectSettings`, the current node under consideration, and
 * the last matched node, returns true IFF the current node satisfies all of the
 * selection setting
 *
 * @internal
 */
export const checkSettings = (
  { depth }: SelectSettings,
  { hierarchy }: TagSpec,
  root: TagSpec
): MR.MatchResult =>
  F.pipe(
    depth,
    O.fold(
      () => MR.MatchOk,
      (depth) =>
        F.pipe(
          hierarchy,
          RA.foldLeft(
            () => MR.MatchOk,
            (current) => {
              const monoidPredicate: M.Monoid<(s: TagSpan) => boolean> = M.getFunctionMonoid(
                M.monoidAll
              )<TagSpan>()

              const isChildOf = (s: TagSpan): boolean => s.start < current.value.start
              const exceedsDepth = (s: TagSpan): boolean => current.value.end < s.end
              const containsCurrent = monoidPredicate.concat(isChildOf, exceedsDepth)

              const currentDepth = F.pipe(
                root.hierarchy,
                RA.foldMap(M.monoidSum)(
                  Tr.foldMap(M.monoidSum)((s) => (containsCurrent(s) ? 1 : 0))
                )
              )

              return currentDepth < depth
                ? MR.MatchFail
                : currentDepth > depth
                ? MR.MatchCull
                : MR.MatchOk
            }
          )
        )
    )
  )

const nodeMatches = (
  selection: Selection,
  info: TagInfo,
  curr: TagSpec,
  root: TagSpec
): MR.MatchResult =>
  F.pipe(
    selection.strategy,
    foldStrategy({
      SelectOne: (tag, preds) =>
        MR.semigroupMatchResult.concat(
          checkSettings(selection.settings, curr, root),
          checkTag(tag, preds, info)
        ),
      SelectAny: (preds) =>
        MR.semigroupMatchResult.concat(
          checkSettings(selection.settings, curr, root),
          checkPredicates(info.token, preds)
        ),
      SelectText: () =>
        MR.semigroupMatchResult.concat(
          checkSettings(selection.settings, curr, root),
          F.pipe(
            info.token,
            T.fold({
              TagOpen: F.constFalse,
              TagClose: F.constFalse,
              Text: F.constTrue,
              Comment: F.constFalse
            }),
            MR.fromBoolean
          )
        )
    })
  )
