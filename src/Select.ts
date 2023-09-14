/**
 * @since 1.0.0
 */
import type * as Option from "@effect/data/Option"
import type { Predicate } from "@effect/data/Predicate"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as internal from "@effect/scraper/internal/select"
import type * as TagSpec from "@effect/scraper/TagSpec"

/**
 * Represents a selection of an HTML DOM tree to be operated upon by a web
 * `Scraper`. The selection includes the opening tag that matches the selection,
 * all of the inner tags, and the corresponding closing tag (if any).
 *
 * @since 1.0.0
 * @category model
 */
export type Selector = ReadonlyArray<Selection>

/**
 * Represents the strategy used for the selection of an HTML DOM tree to be
 * operated on by a `Scraper` in addition to settings associated with the
 * `Selection`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Selection {
  readonly strategy: Select.Strategy
  readonly settings: Select.Settings
}

/**
 * @since 1.0.0
 */
export declare namespace Select {
  /**
   * Represents a method that takes an `HtmlToken` and returns a boolean
   * indicating if the attributes of an HTML tag match a specified predicate.
   *
   * @since 1.0.0
   * @category models
   */
  export type AttributePredicate = Predicate<ReadonlyArray<HtmlTokenizer.Attribute>>

  /**
   * Represents the ephemeral metadata that each `TagSpec` contains, which has
   * information that is not instrinsic in the subtree that corresponds with a
   * given `TagSpec`.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Context {
    readonly position: number
    readonly inChroot: boolean
  }

  /**
   * Represents additional criteria for a `Selector` that must be satisfied in
   * addition to the `SelectNode`. This includes criteria that are dependent on
   * the context of the current node (e.g. the depth in relation to the
   * previously matched `SelectNode`).
   *
   * @since 1.0.0
   * @category models
   */
  export interface Settings {
    /**
     * The required depth of the current `SelectNode` in relation to the
     * previously matched `SelectNode`.
     */
    readonly depth: Option.Option<number>
  }

  /**
   * Represents the strategy used for selection of an HTML DOM tree to be
   * operated on by a `Scraper`.
   *
   * @since 1.0.0
   * @category models
   */
  export type Strategy = SelectOne | SelectAny | SelectText

  /**
   * Represents selection of an HTML DOM tree based upon a specific tag
   * and an optional list of `AttributePredicate`
   *
   * @since 1.0.0
   * @category models
   */
  export interface SelectOne {
    readonly _tag: "SelectOne"
    readonly tag: string
    readonly predicates: ReadonlyArray<AttributePredicate>
  }

  /**
   * Represents selection of any node within the HTML DOM tree (including
   * tags and bare text) which can be narrowed down by specifying a list
   * of `AttributePredicate`s that must also match a given node.
   *
   * @since 1.0.0
   * @category models
   */
  export interface SelectAny {
    readonly _tag: "SelectAny"
    readonly predicates: ReadonlyArray<AttributePredicate>
  }

  /**
   * Represents selection of all text nodes within the HTML DOM tree.
   *
   * @since 1.0.0
   * @category models
   */
  export interface SelectText {
    readonly _tag: "SelectText"
  }
}

/**
 * Constructs a new select `Context` object.
 *
 * @since 1.0.0
 * @category constructors
 */
export const context: (position: number, inChroot: boolean) => Select.Context = internal.context

/**
 * Constructs a new `Selection`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const selection: (strategy: Select.Strategy, settings: Select.Settings) => Selection = internal.selection

/**
 * Constructs a new select `Settings` object.
 *
 * @since 1.0.0
 * @category constructors
 */
export const settings: (depth: Option.Option<number>) => Select.Settings = internal.settings

/**
 * The default select `Settings`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const defaultSettings: Select.Settings = internal.defaultSettings

// /**
//  * Constructs a `Select.Strategy` which matches a single Html node for which the
//  * specified `tag` is equivalent and list of `AttributePredicate`s hold true.
//  *
//  * @since 1.0.0
//  * @category constructors
//  */
// export const one: (tag: string, predicates?: ReadonlyArray<Select.AttributePredicate>) => Select.Strategy = internal.one

// /**
//  * Constructs a `Select.Strategy` which matches any Html node for which the
//  * specified list of `AttributePredicate`s holds true.
//  *
//  * @since 1.0.0
//  * @category constructors
//  */
// export const any: (predicates?: ReadonlyArray<Select.AttributePredicate>) => Select.Strategy = internal.any

// /**
//  * Constructs a `Select.Strategy` which matches a text node.
//  *
//  * @since 1.0.0
//  * @category constructors
//  */
// export const text: Select.Strategy = internal.text

/**
 * The `tag` combinator creates a `Selector` that will match a tag with the
 * specified `name`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const tag: (name: string) => Selector = internal.tag

/**
 * The `any` combinator creates a `Selector` that will match any node (including
 * tags and bare text).
 *
 * @since 1.0.0
 * @category constructors
 */
export const any: Selector = internal.any

/**
 * The `text` combinator creates a `Selector` that will match all text nodes.
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: Selector = internal.text

/**
 * The `withAttributes` combinator creates a `Selector` by combining a tag name
 * with a list of `AttributePredicate` The resulting `Selector` will match if
 * the tags with the specified `name` and that satisfy all of the specified
 * `AttributePredicates`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const withAttributes: (name: string, predicates: ReadonlyArray<Select.AttributePredicate>) => Selector =
  internal.withAttributes

/**
 * The `anyWithAttributes` combinator creates a `Selector` that takes a list of
 * `AttributePredicate`s and will match any tags that satisfy all of the specified
 * `AttributePredicates`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const anyWithAttributes: (predicates: ReadonlyArray<Select.AttributePredicate>) => Selector =
  internal.anyWithAttributes

/**
 * The `attribute` combinator creates an `AttributePredicate` that will match
 * attributes with the specified `key` and `value`.
 *
 * If attempting to match a specific class of a tag with potentially multiple classes,
 * use `hasClass` instead.
 *
 * @since 1.0.0
 * @category combinators
 */
export const attribute: (key: string, value: string) => Select.AttributePredicate = internal.attribute

/**
 * The `anyAttribute` combinator creates an `AttributePredicate` that will match
 * any attributes with the specified `value`.
 *
 * If attempting to match a specific class of a tag with potentially multiple classes,
 * use `hasClass` instead.
 *
 * @since 1.0.0
 * @category combinators
 */
export const anyAttribute: (value: string) => Select.AttributePredicate = internal.anyAttribute

/**
 * The `attributeRegex` combinator creates an `AttributePredicate` that will
 * match attributes with the specified `key` and whose value matches the
 * given `RegExp`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const attributeRegex: (key: string, regex: RegExp) => Select.AttributePredicate = internal.attributeRegex

/**
 * The `attributeRegex` combinator creates an `AttributePredicate` that will
 * match any attributes whose value matches the given `RegExp`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const anyAttributeRegex: (regex: RegExp) => Select.AttributePredicate = internal.anyAttributeRegex

/**
 * The `atDepth` combinator constrains a `Selector` to only match when it is
 * at a `depth` below the previous selector.
 *
 * In the example below, a `Selector` is created that matches anchor tags that
 * are direct children of a div tag.
 *
 * ```ts
 * pipe(
 *   tag('div'),
 *   nested(tag('a')),
 *   atDepth(1)
 * )
 * ```
 *
 * @category combinators
 * @since 0.0.1
 */
export const atDepth: {
  (depth: number): (selector: Selector) => Selector
  (selector: Selector, depth: number): Selector
} = internal.atDepth

/**
 * The `nested` combinator creates a `Selector` by nesting the `child` selector
 * under the `parent` selector`.
 *
 * In the example below, a `Selector` is created that matches anchor tags nested
 * arbitrarily deep within a div tag.
 *
 * ```ts
 * pipe(
 *   tag('div'),
 *   nested(tag('a'))
 * )
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const nested: {
  (parent: Selector): (child: Selector) => Selector
  (child: Selector, parent: Selector): Selector
} = internal.nested

/**
 * The classes of an HTML tag are definied as a space-separated list of
 * characters in a string designated by the `class` attribute. The `hasClass`
 * combinator creates an `AttributePredicate` that will match a `class`
 * attribute if the specified `className` appears anywhere in the
 * space-separated list of classes.
 *
 * @since 1.0.0
 * @category combinators
 */
export const hasClass: (className: string) => Select.AttributePredicate = internal.hasClass

/**
 * The `match` combinator allows for the creation of arbitrary `AttributePredicate`
 * The argument is a function that takes an attribute's key and value and returns
 * a boolean indicating if the attribute satisfies the predicate.
 *
 * @since 1.0.0
 * @category combinators
 */
export const satisfies: (f: (key: string, value: string) => boolean) => Select.AttributePredicate = internal.satisfies

/**
 * @since 1.0.0
 * @category selectors
 */
export const select: {
  (selector: Selector): (spec: TagSpec.TagSpec) => ReadonlyArray<TagSpec.TagSpec>
  (spec: TagSpec.TagSpec, selector: Selector): ReadonlyArray<TagSpec.TagSpec>
} = internal.select
