import { dual } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as matchResult from "@effect/scraper/internal/matchResult"
import * as tagSpan from "@effect/scraper/internal/tagSpan"
import * as tagSpec from "@effect/scraper/internal/tagSpec"
import type * as MatchResult from "@effect/scraper/MatchResult"
import type * as Select from "@effect/scraper/Select"
import type * as TagInfo from "@effect/scraper/TagInfo"
import type * as TagSpan from "@effect/scraper/TagSpan"
import type * as TagSpec from "@effect/scraper/TagSpec"

/** @internal */
export const context = (position: number, inChroot: boolean): Select.Select.Context => ({
  position,
  inChroot
})

/** @internal */
export const selection = (strategy: Select.Select.Strategy, settings: Select.Select.Settings): Select.Selection => ({
  strategy,
  settings
})

/** @internal */
export const settings = (depth: Option.Option<number>): Select.Select.Settings => ({ depth })

/** @internal */
export const defaultSettings: Select.Select.Settings = { depth: Option.none() }

/** @internal */
export const selectOne = (
  tag: string,
  predicates: ReadonlyArray<Select.Select.AttributePredicate> = ReadonlyArray.empty()
): Select.Select.Strategy => ({
  _tag: "SelectOne",
  tag,
  predicates
})

/** @internal */
export const selectAny = (
  predicates: ReadonlyArray<Select.Select.AttributePredicate> = ReadonlyArray.empty()
): Select.Select.Strategy => ({
  _tag: "SelectAny",
  predicates
})

/** @internal */
export const selectText: Select.Select.Strategy = { _tag: "SelectText" }

/** @internal */
export const tag = (name: string): Select.Selector => ReadonlyArray.of(selection(selectOne(name), defaultSettings))

/** @internal */
export const any: Select.Selector = ReadonlyArray.of(selection(selectAny(), defaultSettings))

/** @internal */
export const text: Select.Selector = ReadonlyArray.of(selection(selectText, defaultSettings))

/** @internal */
export const withAttributes = (
  name: string,
  predicates: ReadonlyArray<Select.Select.AttributePredicate>
): Select.Selector => ReadonlyArray.of(selection(selectOne(name, predicates), defaultSettings))

/** @internal */
export const anyWithAttributes = (predicates: ReadonlyArray<Select.Select.AttributePredicate>): Select.Selector =>
  ReadonlyArray.of(selection(selectAny(predicates), defaultSettings))

/** @internal */
export const attribute = (key: string, value: string): Select.Select.AttributePredicate => (attributes) =>
  attributes.some((attribute) => matchAttrKey(attribute, Option.some(key)) && attribute.value === value)

/** @internal */
export const anyAttribute = (value: string): Select.Select.AttributePredicate => (attributes) =>
  attributes.some((attribute) => matchAttrKey(attribute, Option.none()) && attribute.value === value)

/** @internal */
export const attributeRegex = (key: string, regex: RegExp): Select.Select.AttributePredicate => (attributes) =>
  attributes.some((attribute) => matchAttrKey(attribute, Option.some(key)) && regex.test(attribute.value))

/** @internal */
export const anyAttributeRegex = (regex: RegExp): Select.Select.AttributePredicate => (attributes) =>
  attributes.some((attribute) => matchAttrKey(attribute, Option.none()) && regex.test(attribute.value))

/** @internal */
const matchAttrKey = (attribute: HtmlTokenizer.Attribute, key: Option.Option<string>): boolean => {
  if (Option.isSome(key)) {
    return key.value.toLowerCase() === attribute.key.toLowerCase()
  }
  return true
}

/** @internal */
export const atDepth = dual<
  (depth: number) => (selector: Select.Selector) => Select.Selector,
  (selector: Select.Selector, depth: number) => Select.Selector
>(2, (selector, depth) => {
  return ReadonlyArray.reduce(selector, ReadonlyArray.empty(), (acc, curr, index) =>
    index === selector.length - 1
      ? ReadonlyArray.prepend(acc, selection(curr.strategy, settings(Option.some(depth))))
      : ReadonlyArray.prepend(acc, curr))
})

/** @internal */
export const nested = dual<
  (parent: Select.Selector) => (child: Select.Selector) => Select.Selector,
  (child: Select.Selector, parent: Select.Selector) => Select.Selector
>(2, (child, parent) => ReadonlyArray.appendAll(child, parent))

/** @internal */
export const hasClass = (className: string): Select.Select.AttributePredicate => (attributes) =>
  attributes.some((attribute) => attribute.key === "class" && attribute.value.includes(className))

/** @internal */
export const satisfies =
  (f: (key: string, value: string) => boolean): Select.Select.AttributePredicate => (attributes) =>
    attributes.some((attribute) => f(attribute.key, attribute.value))

/** @internal */
export const select = dual<
  (selector: Select.Selector) => (spec: TagSpec.TagSpec) => ReadonlyArray<TagSpec.TagSpec>,
  (spec: TagSpec.TagSpec, selector: Select.Selector) => ReadonlyArray<TagSpec.TagSpec>
>(
  2,
  (spec, selector) =>
    selectNodes(ReadonlyArray.empty(), selector, spec, spec).map((spec, index) =>
      tagSpec.make(context(index, true), spec.hierarchy, spec.tags)
    )
)

/** @internal */
const liftSiblings = (
  accumulator: TagSpan.TagForest,
  forest: TagSpan.TagForest,
  start: number,
  end: number
): TagSpan.TagForest => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(forest)) {
    const head = forest[0]
    const tail = forest.slice(1)
    if (start < head.value.start && head.value.end < end) {
      return ReadonlyArray.append(liftSiblings(accumulator, tail, start, end), head)
    }
    if (end < head.value.start || head.value.end < start) {
      return liftSiblings(accumulator, tail, start, end)
    }
    return liftSiblings(head.forest, liftSiblings(accumulator, tail, start, end), start, end)
  }
  return accumulator
}

/** @internal */
const checkPredicates = (
  token: HtmlTokenizer.HtmlToken,
  predicates: ReadonlyArray<Select.Select.AttributePredicate>
): MatchResult.MatchResult => {
  if (ReadonlyArray.isEmptyReadonlyArray(predicates)) {
    return matchResult.fromBoolean(token._tag === "TagOpen" || token._tag === "Text")
  }
  return matchResult.fromBoolean(token._tag === "TagOpen" && predicates.every((f) => f(token.attributes)))
}

/** @internal */
const checkTag = (
  tagName: string,
  predicates: ReadonlyArray<Select.Select.AttributePredicate>,
  { token }: TagInfo.TagInfo
): MatchResult.MatchResult => {
  const left = checkPredicates(token, predicates)
  const right = matchResult.fromBoolean(token._tag === "TagOpen" && token.name.toLowerCase() === tagName.toLowerCase())
  return matchResult.combine(left, right)
}

/** @internal */
const mapTree = <A, B>(self: TagSpan.Tree<A>, f: (a: A) => B): TagSpan.Tree<B> => ({
  value: f(self.value),
  forest: self.forest.map((tree) => mapTree(tree, f))
})

/** @internal */
export const reduceTree = <A, B>(self: TagSpan.Tree<A>, b: B, f: (b: B, a: A) => B): B => {
  let r: B = f(b, self.value)
  const len = self.forest.length
  for (let i = 0; i < len; i++) {
    r = reduceTree(self.forest[i], r, f)
  }
  return r
}

/**
 * Give an instance of `SelectSettings`, the current node under consideration, and
 * the last matched node, returns true IFF the current node satisfies all of the
 * selection setting
 *
 * @internal
 */
const checkSettings = (
  { depth }: Select.Select.Settings,
  { hierarchy }: TagSpec.TagSpec,
  root: TagSpec.TagSpec
): MatchResult.MatchResult => {
  if (Option.isNone(depth)) {
    return matchResult.ok
  }
  if (ReadonlyArray.isNonEmptyReadonlyArray(hierarchy)) {
    const current = hierarchy[0]
    const isChildOf = (span: TagSpan.TagSpan): boolean => span.start < current.value.start
    const exceedsDepth = (span: TagSpan.TagSpan): boolean => current.value.end < span.end
    const containsCurrent = (span: TagSpan.TagSpan): boolean => isChildOf(span) && exceedsDepth(span)
    const currentDepth = root.hierarchy.reduce(
      (acc, curr) => acc + reduceTree(curr, 0, (n, span) => n + (containsCurrent(span) ? 1 : 0)),
      0
    )
    if (currentDepth < depth.value) {
      return matchResult.fail
    }
    if (currentDepth > depth.value) {
      return matchResult.cull
    }
    return matchResult.ok
  }
  return matchResult.ok
}

/** @internal */
const nodeMatches = (
  selection: Select.Selection,
  info: TagInfo.TagInfo,
  current: TagSpec.TagSpec,
  root: TagSpec.TagSpec
): MatchResult.MatchResult => {
  switch (selection.strategy._tag) {
    case "SelectAny": {
      return matchResult.combine(
        checkSettings(selection.settings, current, root),
        checkPredicates(info.token, selection.strategy.predicates)
      )
    }
    case "SelectOne": {
      return matchResult.combine(
        checkSettings(selection.settings, current, root),
        checkTag(selection.strategy.tag, selection.strategy.predicates, info)
      )
    }
    case "SelectText": {
      return matchResult.combine(
        checkSettings(selection.settings, current, root),
        matchResult.fromBoolean(info.token._tag === "Text")
      )
    }
  }
}

/** @internal */
const updateHierarchy = (curr: TagSpec.TagSpec, hierarchy: TagSpan.TagForest): TagSpec.TagSpec =>
  tagSpec.make(curr.context, hierarchy, curr.tags)

/** @internal */
const recenter = (parent: TagSpan.TagSpan) => (child: TagSpan.TagSpan): TagSpan.TagSpan =>
  tagSpan.make(child.start - parent.start, child.end - parent.start)

/** @internal */
const shrinkSpecWith = (spec: TagSpec.TagSpec, parent: TagSpan.Tree<TagSpan.TagSpan>): TagSpec.TagSpec => {
  const { end, start } = parent.value
  return tagSpec.make(
    spec.context,
    ReadonlyArray.of(mapTree(parent, recenter(parent.value))),
    spec.tags.slice(start, end + 1)
  )
}

/** @internal */
const selectNodes = (
  accumulator: ReadonlyArray<TagSpec.TagSpec>,
  selectors: Select.Selector,
  current: TagSpec.TagSpec,
  root: TagSpec.TagSpec
): ReadonlyArray<TagSpec.TagSpec> => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(selectors)) {
    const hierarchy = current.hierarchy
    const selector = selectors[0]
    const rest = selectors.slice(1)
    if (ReadonlyArray.isNonEmptyReadonlyArray(hierarchy)) {
      const first = hierarchy[0]
      const after = hierarchy.slice(1)
      const { end, start } = first.value
      if (ReadonlyArray.isNonEmptyReadonlyArray(rest)) {
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
        const siblings = liftSiblings(ReadonlyArray.empty(), after, start, end)
        const matchResult = nodeMatches(selector, current.tags[start], current, root)
        switch (matchResult._tag) {
          case "MatchOk": {
            const subNodes = selectNodes(accumulator, selectors, updateHierarchy(current, hierarchy.slice(1)), root)
            return selectNodes(
              subNodes,
              rest,
              updateHierarchy(current, ReadonlyArray.appendAll(first.forest, siblings)),
              updateHierarchy(current, ReadonlyArray.append(siblings, first))
            )
          }
          case "MatchFail": {
            const subNodes = selectNodes(accumulator, selectors, updateHierarchy(current, after), root)
            return selectNodes(subNodes, selectors, updateHierarchy(current, first.forest), root)
          }
          case "MatchCull": {
            return selectNodes(accumulator, selectors, updateHierarchy(current, after), root)
          }
        }
      }
      const matchResult = nodeMatches(selector, current.tags[start], current, root)
      switch (matchResult._tag) {
        case "MatchOk": {
          const forestNodes = selectNodes(accumulator, [selector], updateHierarchy(current, first.forest), root)
          const nodes = selectNodes(forestNodes, [selector], updateHierarchy(current, after), root)
          return ReadonlyArray.prepend(nodes, shrinkSpecWith(current, first))
        }
        case "MatchFail": {
          const siblingNodes = selectNodes(accumulator, [selector], updateHierarchy(current, after), root)
          return selectNodes(siblingNodes, [selector], updateHierarchy(current, first.forest), root)
        }
        case "MatchCull": {
          return selectNodes(accumulator, [selector], updateHierarchy(current, after), root)
        }
      }
    }
    return accumulator
  }
  return accumulator
}
