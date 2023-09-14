/**
 * @since 1.0.0
 */
import type * as Context from "@effect/data/Context"
import type * as Layer from "@effect/io/Layer"
import * as internal from "@effect/scraper/internal/htmlTokenizer"
import type * as Stream from "@effect/stream/Stream"

/**
 * The `HtmlTokenizer` is responsible for parsing an HTML string and producing
 * a sequence of `HtmlToken`.
 *
 * @since 1.0.0
 * @category models
 */
export interface HtmlTokenizer {
  tokenize(html: string): Stream.Stream<never, Error, HtmlToken>
}

/**
 * The service tag for an `HtmlTokenizer`.
 *
 * @since 1.0.0
 * @category context
 */
export const HtmlTokenizer: Context.Tag<HtmlTokenizer, HtmlTokenizer> = internal.Tag

/**
 * Represents a single token within an Html document.
 *
 * @since 1.0.0
 * @category models
 */
export type HtmlToken = TagOpen | TagClose | Text | Comment

/**
 * Represents an Html opening tag.
 *
 * @since 1.0.0
 * @category models
 */
export interface TagOpen {
  readonly _tag: "TagOpen"
  readonly name: string
  readonly attributes: ReadonlyArray<Attribute>
}

/**
 * Represents an Html closing tag.
 *
 * @since 1.0.0
 * @category models
 */
export interface TagClose {
  readonly _tag: "TagClose"
  readonly name: string
}

/**
 * Represents a text node within an Html document.
 *
 * @since 1.0.0
 * @category models
 */
export interface Text {
  readonly _tag: "Text"
  readonly text: string
}

/**
 * Represents a comment within an Html document.
 *
 * @since 1.0.0
 * @category models
 */
export interface Comment {
  readonly _tag: "Comment"
  readonly comment: string
}

/**
 * Represents an attribute on an Html tag.
 *
 * @since 1.0.0
 * @category models
 */
export interface Attribute {
  readonly key: string
  readonly value: string
}

/**
 * Constructs a new `TagOpen` token.
 *
 * @since 1.0.0
 * @category constructors
 */
export const tagOpen: (name: string, attributes?: ReadonlyArray<Attribute>) => HtmlToken = internal.tagOpen

/**
 * Constructs a new `TagClose` token.
 *
 * @since 1.0.0
 * @category constructors
 */
export const tagClose: (name: string) => HtmlToken = internal.tagClose

/**
 * Constructs a new `Text` token.
 *
 * @since 1.0.0
 * @category constructors
 */
export const text: (text: string) => HtmlToken = internal.text

/**
 * Constructs a new `Comment` token.
 *
 * @since 1.0.0
 * @category constructors
 */
export const comment: (comment: string) => HtmlToken = internal.comment

/**
 * Constructs a new `Attribute`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const attribute: (key: string, value: string) => Attribute = internal.attribute

/**
 * Tokenizes an HTML string into a `Stream` of `HtmlToken`.
 */
export const tokenize: (html: string) => Stream.Stream<HtmlTokenizer, Error, HtmlToken> = internal.tokenize

/**
 * The `Layer` which constructs an `HtmlTokenizer`.
 *
 * @since 1.0.0
 * @category context
 */
export const layer: Layer.Layer<never, never, HtmlTokenizer> = internal.layer
