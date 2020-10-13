/**
 * @since 0.0.1
 */
import * as Eq from 'fp-ts/Eq'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { absurd, flow, pipe, Endomorphism } from 'fp-ts/function'
import * as C from 'parser-ts/char'
import { Show } from 'fp-ts/lib/Show'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents a single HTML token.
 *
 * @category model
 * @since 0.0.1
 */
export type Token =
  | TagOpen
  | TagSelfClose
  | TagClose
  | ContentText
  | ContentChar
  | Comment
  | Doctype

/**
 * Represents an opening HTML tag with arbitrarily ordered attributes.
 *
 * ```html
 * <div id="test">
 * ```
 *
 * @category model
 * @since 0.0.1
 */
export interface TagOpen {
  readonly _tag: 'TagOpen'
  readonly name: string
  readonly attributes: ReadonlyArray<Attribute>
}

/**
 * Represents a self-closing HTML tag with arbitrarily ordered attributes.
 *
 * ```html
 * <div id="test" />
 * ```
 *
 * @category model
 * @since 0.0.1
 */
export interface TagSelfClose {
  readonly _tag: 'TagSelfClose'
  readonly name: string
  readonly attributes: ReadonlyArray<Attribute>
}

/**
 * Represents a closing HTML tag.
 *
 * ```html
 * </div>
 * ```

 * @category model
 * @since 0.0.1
 */
export interface TagClose {
  readonly _tag: 'TagClose'
  readonly name: string
}

/**
 * Represents the content between two HTML tags.
 *
 * ```html
 * <div>
 *   I am the content text.
 * </div>
 * ```
 *
 * @category model
 * @since 0.0.1
 */
export interface ContentText {
  readonly _tag: 'ContentText'
  readonly text: string
}

/**
 * Represents a single character of content.
 *
 * ```html
 * <div>
 * *
 * </div>
 * ```
 *
 * @category model
 * @since 0.0.1
 */
export interface ContentChar {
  readonly _tag: 'ContentChar'
  readonly char: C.Char
}

/**
 * Represents the content of an HTML comment.
 *
 * ```html
 * <!-- I am the content of the comment -->
 * ```
 * @category model
 * @since 0.0.1
 */
export interface Comment {
  readonly _tag: 'Comment'
  readonly comment: string
}

/**
 * Represents the HTML doctype token.
 *
 * ```html
 * <!DOCTYPE html>
 * ```
 *
 * @category model
 * @since 0.0.1
 */
export interface Doctype {
  readonly _tag: 'Doctype'
  readonly content: string
}

/**
 * Represents the key/value pairing of an HTML attribute.
 *
 * ```html
 * <div key="value" />
 * ```
 *
 * @category model
 * @since 0.0.1
 */
export interface Attribute {
  readonly key: string
  readonly value: string
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const TagOpen = (name: string, attributes: ReadonlyArray<Attribute>): Token => ({
  _tag: 'TagOpen',
  name,
  attributes
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const TagSelfClose = (name: string, attributes: ReadonlyArray<Attribute>): Token => ({
  _tag: 'TagSelfClose',
  name,
  attributes
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const TagClose = (name: string): Token => ({
  _tag: 'TagClose',
  name
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const ContentText = (text: string): Token => ({
  _tag: 'ContentText',
  text
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const ContentChar = (char: string): Token => ({
  _tag: 'ContentChar',
  char
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const Comment = (comment: string): Token => ({
  _tag: 'Comment',
  comment
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const Doctype = (content: string): Token => ({
  _tag: 'Doctype',
  content
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const Attribute = (key: string, value: string): Attribute => ({
  key,
  value
})

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.0.1
 */
export const fold = <R>(patterns: {
  readonly TagOpen: (name: string, attributes: ReadonlyArray<Attribute>) => R
  readonly TagSelfClose: (name: string, attributes: ReadonlyArray<Attribute>) => R
  readonly TagClose: (name: string) => R
  readonly ContentText: (text: string) => R
  readonly ContentChar: (char: string) => R
  readonly Comment: (comment: string) => R
  readonly Doctype: (content: string) => R
}): ((token: Token) => R) => {
  const f = (x: Token): R => {
    switch (x._tag) {
      case 'TagOpen':
        return patterns.TagOpen(x.name, x.attributes)
      case 'TagSelfClose':
        return patterns.TagSelfClose(x.name, x.attributes)
      case 'TagClose':
        return patterns.TagClose(x.name)
      case 'ContentText':
        return patterns.ContentText(x.text)
      case 'ContentChar':
        return patterns.ContentChar(x.char)
      case 'Comment':
        return patterns.Comment(x.comment)
      case 'Doctype':
        return patterns.Doctype(x.content)
      default:
        return absurd<R>(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

const charToText: Endomorphism<Token> = (x) =>
  pipe(
    x,
    fold({
      TagOpen: () => x,
      TagSelfClose: () => x,
      TagClose: () => x,
      ContentText: () => x,
      ContentChar: (char) => ContentText(char),
      Comment: () => x,
      Doctype: () => x
    })
  )

const concatTexts: Endomorphism<ReadonlyArray<Token>> = RA.foldLeft(
  () => RA.empty,
  (x, xs) =>
    pipe(
      xs,
      RA.foldLeft(
        () => RA.of(x),
        (y, ys) =>
          x._tag === 'ContentText' && y._tag === 'ContentText'
            ? concatTexts(RA.cons(ContentText(x.text + y.text), ys))
            : RA.cons(x, RA.cons(y, concatTexts(ys)))
      )
    )
)

/**
 * Reduces the complexity of a tokenized HTML document by melding neighboring
 * `ContentChar` and `ContentText` tokens together, and drops empty text elements.
 *
 * @category combinators
 * @since 0.0.1
 */
export const canonicalizeTokens: Endomorphism<ReadonlyArray<Token>> = flow(
  RA.filterMap((x) =>
    pipe(
      x,
      fold({
        TagOpen: () => O.some(x),
        TagSelfClose: () => O.some(x),
        TagClose: () => O.some(x),
        ContentText: (text) => (text.trim().length > 0 ? O.some(x) : O.none),
        ContentChar: (char) => (char.trim().length > 0 ? O.some(x) : O.none),
        Comment: () => O.some(x),
        Doctype: () => O.some(x)
      })
    )
  ),
  RA.map(charToText),
  concatTexts
)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const eqAttribute: Eq.Eq<Attribute> = Eq.getStructEq({
  key: Eq.eqString,
  value: Eq.eqString
})

const eqTagOpen: Eq.Eq<TagOpen> = Eq.getStructEq({
  _tag: Eq.eqString,
  name: Eq.eqString,
  attributes: RA.getEq(eqAttribute)
})

const eqTagSelfClose: Eq.Eq<TagSelfClose> = eqTagOpen as any

const eqTagClose: Eq.Eq<TagClose> = Eq.getStructEq({
  _tag: Eq.eqString,
  name: Eq.eqString
})

const eqContentText: Eq.Eq<ContentText> = Eq.getStructEq({
  _tag: Eq.eqString,
  text: Eq.eqString
})

const eqContentChar: Eq.Eq<ContentChar> = Eq.getStructEq({
  _tag: Eq.eqString,
  char: Eq.eqString
})

const eqComment: Eq.Eq<Comment> = Eq.getStructEq({
  _tag: Eq.eqString,
  comment: Eq.eqString
})

const eqDoctype: Eq.Eq<Doctype> = Eq.getStructEq({
  _tag: Eq.eqString,
  content: Eq.eqString
})

const foldAny = M.fold(M.monoidAny)

/**
 * @category instances
 * @since 0.0.1
 */
export const eqToken: Eq.Eq<Token> = {
  equals: (x, y) =>
    foldAny([
      eqTagOpen.equals(x as any, y as any),
      eqTagSelfClose.equals(x as any, y as any),
      eqTagClose.equals(x as any, y as any),
      eqContentText.equals(x as any, y as any),
      eqContentChar.equals(x as any, y as any),
      eqComment.equals(x as any, y as any),
      eqDoctype.equals(x as any, y as any)
    ])
}

const foldS = M.fold(M.monoidString)

const showAttribute: Show<Attribute> = {
  show: ({ key, value }) => foldS([key, '="', value, '"'])
}

const showAttributes: Show<ReadonlyArray<Attribute>> = RA.getShow(showAttribute)

/**
 * @category instances
 * @since 0.0.1
 */
export const showToken: Show<Token> = {
  show: fold({
    TagOpen: (name, attrs) => foldS(['<', name, ' ', showAttributes.show(attrs), '>']),
    TagSelfClose: (name, attrs) => foldS(['<', name, ' ', showAttributes.show(attrs), '>']),
    TagClose: (name) => foldS(['<', name, '>']),
    ContentText: (text) => text,
    ContentChar: (char) => char,
    Comment: (comment) => foldS(['<!-- ', comment, ' -->']),
    Doctype: (content) => foldS(['<!DOCTYPE', content, '>'])
  })
}
