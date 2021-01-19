/**
 * @since 0.0.1
 */
import type { Option } from 'fp-ts/Option'
import { Parser } from 'htmlparser2'
import * as Eq from 'fp-ts/Eq'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as RA from 'fp-ts/ReadonlyArray'
import type { Show } from 'fp-ts/Show'
import { absurd, flow, pipe, Endomorphism, identity } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export type Token = TagOpen | TagClose | Text | Comment

/**
 * @internal
 * @since 0.0.1
 */
export interface TagOpen {
  readonly _tag: 'TagOpen'
  readonly name: string
  readonly attributes: ReadonlyArray<Attribute>
}

/**
 * @internal
 * @since 0.0.1
 */
export interface TagClose {
  readonly _tag: 'TagClose'
  readonly name: string
}

/**
 * @internal
 * @since 0.0.1
 */
export interface Text {
  readonly _tag: 'Text'
  readonly text: string
}

/**
 * @internal
 * @since 0.0.1
 */
export interface Comment {
  readonly _tag: 'Comment'
  readonly comment: string
}

/**
 * @internal
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
 * @internal
 * @since 0.0.1
 */
export const TagOpen = (name: string, attributes: ReadonlyArray<Attribute>): Token => ({
  _tag: 'TagOpen',
  name,
  attributes
})

/**
 * @internal
 * @since 0.0.1
 */
export const TagClose = (name: string): Token => ({
  _tag: 'TagClose',
  name
})

/**
 * @internal
 * @since 0.0.1
 */
export const Text = (text: string): Token => ({
  _tag: 'Text',
  text
})

/**
 * @internal
 * @since 0.0.1
 */
export const Comment = (comment: string): Token => ({
  _tag: 'Comment',
  comment
})

/**
 * @internal
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
 * @internal
 * @since 0.0.1
 */
export const fold = <R>(patterns: {
  readonly TagOpen: (name: string, attributes: ReadonlyArray<Attribute>) => R
  readonly TagClose: (name: string) => R
  readonly Text: (text: string) => R
  readonly Comment: (comment: string) => R
}): ((token: Token) => R) => {
  const f = (x: Token): R => {
    switch (x._tag) {
      case 'TagOpen':
        return patterns.TagOpen(x.name, x.attributes)
      case 'TagClose':
        return patterns.TagClose(x.name)
      case 'Text':
        return patterns.Text(x.text)
      case 'Comment':
        return patterns.Comment(x.comment)
      default:
        return absurd<R>(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * Reduces the complexity of a tokenized HTML document by dropping empty `Text` tokens.
 *
 * @internal
 * @since 0.0.1
 */
export const canonicalizeTokens: Endomorphism<ReadonlyArray<Token>> = flow(
  RA.filterMap((x) =>
    pipe(
      x,
      fold({
        TagOpen: () => O.some(x),
        TagClose: () => O.some(x),
        Text: (text) => (text.trim().length > 0 ? O.some(x) : O.none),
        Comment: () => O.some(x)
      })
    )
  )
)

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const parse = (source: string): ReadonlyArray<Token> => {
  // Track the starting and ending index of the parser so that
  // self-closing tags can be recognized
  let startIndex: Option<number> = O.none
  let endIndex: Option<number> = O.none
  const eqOption = O.getEq(Eq.eqNumber)

  const tokens: Array<Token> = []

  const parser = new Parser(
    {
      onopentag: (name, attrs) => {
        startIndex = O.some(parser.startIndex)
        endIndex = O.fromNullable(parser.endIndex)

        const attributes = pipe(
          attrs,
          RR.collect((key, value) => Attribute(key, value))
        )
        const token = TagOpen(name, attributes)

        tokens.push(token)
      },
      onclosetag: (name) => {
        if (
          // If the starting and ending index of the parser are
          // exactly equal to what they were in the previous opening
          // tag, then `onclosetag` is being called for a self-closing
          // tag and we can ignore it
          M.fold(M.monoidAll)([
            eqOption.equals(O.some(parser.startIndex), startIndex),
            eqOption.equals(O.fromNullable(parser.endIndex), endIndex)
          ])
        ) {
          return
        }

        const token = TagClose(name)

        tokens.push(token)
      },
      ontext: (text) => {
        const token = Text(text.trim())

        tokens.push(token)
      },
      oncomment: (comment) => {
        const token = Comment(comment)

        tokens.push(token)
      }
    },
    { recognizeSelfClosing: true }
  )

  parser.write(source)
  parser.end()

  return canonicalizeTokens(tokens)
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const showAttribute: Show<Attribute> = {
  show: ({ key, value }) => ` ${key}="${value}"`
}

/**
 * @internal
 * @since 0.0.1
 */
export const showToken: Show<Token> = {
  show: fold({
    TagOpen: (name, attrs) => `<${name}${RA.foldMap(M.monoidString)(showAttribute.show)(attrs)}>`,
    TagClose: (name) => `</${name}>`,
    Text: identity,
    Comment: (comment) => `<!--${comment}-->`
  })
}
