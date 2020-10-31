/**
 * @since 0.0.1
 */
import { Parser } from 'htmlparser2'
import * as E from 'fp-ts/Either'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as RA from 'fp-ts/ReadonlyArray'
import type { Show } from 'fp-ts/Show'
import { absurd, flow, pipe, Endomorphism, identity } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Either = E.Either

/**
 * @category model
 * @since 0.0.1
 */
export type Token = TagOpen | TagClose | Text | Comment

/**
 * @category model
 * @since 0.0.1
 */
export interface TagOpen {
  readonly _tag: 'TagOpen'
  readonly name: string
  readonly attributes: ReadonlyArray<Attribute>
}

/**
 * @category model
 * @since 0.0.1
 */
export interface TagClose {
  readonly _tag: 'TagClose'
  readonly name: string
}

/**
 * @category model
 * @since 0.0.1
 */
export interface Text {
  readonly _tag: 'Text'
  readonly text: string
}

/**
 * @category model
 * @since 0.0.1
 */
export interface Comment {
  readonly _tag: 'Comment'
  readonly comment: string
}

/**
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
export const TagClose = (name: string): Token => ({
  _tag: 'TagClose',
  name
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const Text = (text: string): Token => ({
  _tag: 'Text',
  text
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
 * Reduces the complexity of a tokenized HTML document by melding neighboring
 * `Text` tokens together and dropping empty `Text` tokens.
 */
const canonicalizeTokens: Endomorphism<ReadonlyArray<Token>> = flow(
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
  ),
  RA.reduce<Token, ReadonlyArray<Token>>(RA.empty, (xs, x) =>
    pipe(
      xs,
      RA.foldLeft(
        () => RA.of(x),
        (y, ys) =>
          x._tag === 'Text' && y._tag === 'Text'
            ? RA.cons(Text(x.text + y.text), ys)
            : RA.cons(x, RA.cons(y, ys))
      )
    )
  )
)

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

/**
 * @category parsers
 * @since 0.0.1
 */
export const parse = (source: string): Either<string, ReadonlyArray<Token>> => {
  let error: O.Option<string> = O.none

  const tokens: Array<Token> = []

  const parser = new Parser({
    onopentag: (name, attrs) => {
      const attributes = pipe(
        attrs,
        RR.collect((key, value) => Attribute(key, value))
      )
      const token = TagOpen(name, attributes)

      tokens.push(token)
    },
    onclosetag: (name) => {
      const token = TagClose(name)

      tokens.push(token)
    },
    ontext: (text) => {
      const token = Text(text)

      tokens.push(token)
    },
    oncomment: (comment) => {
      const token = Comment(comment)

      tokens.push(token)
    },
    onerror: (err) => {
      error = O.some(err.message)
    }
  })

  parser.write(source)
  parser.end()

  return pipe(
    error,
    O.fold<string, E.Either<string, ReadonlyArray<Token>>>(
      () => pipe(canonicalizeTokens(tokens), E.right),
      E.left
    )
  )
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const showAttribute: Show<Attribute> = {
  show: ({ key, value }) => `${key}="${value}"`
}

/**
 * @category instances
 * @since 0.0.1
 */
export const showToken: Show<Token> = {
  show: fold({
    TagOpen: (name, attrs) => `<${name} ${RA.foldMap(M.monoidString)(showAttribute.show)(attrs)}>`,
    TagClose: (name) => `<${name}>`,
    Text: identity,
    Comment: (comment) => `<!-- ${comment} -->`
  })
}
