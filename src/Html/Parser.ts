/**
 * The following implementation of an HTML tokenizer follows a similar approach
 * to the Haskell implementation taken by the [`html-parse`]
 * (https://github.com/bgamari/html-parse). The tokenizer acts as a state machine,
 * which changes behavior depending on the current state and current token that is
 * being evaluated by the parser.
 *
 * @since 0.0.1
 */
import * as B from 'fp-ts/boolean'
import * as M from 'fp-ts/Monoid'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe, Lazy } from 'fp-ts/function'
import * as C from 'parser-ts/char'
import * as P from 'parser-ts/Parser'
import * as S from 'parser-ts/string'

import * as T from './Token'

// -------------------------------------------------------------------------------------
// parsers
// -------------------------------------------------------------------------------------

const foldS = M.fold(M.monoidString)

/**
 * This is somewhat of a hack to allow for a `Token` to be returned when the EOF
 * is encountered.
 */
const endOfFileToken: Lazy<T.Token> = () => T.ContentText('')

const dataState: P.Parser<string, T.Token> = pipe(
  S.many(C.notChar('<')),
  P.chain((content) =>
    pipe(
      content.length === 0,
      B.fold(
        () => P.succeed(T.ContentText(content)),
        () => pipe(C.char('<'), P.apSecond(tagOpen))
      )
    )
  )
)

const commentEnd = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('>'),
    P.map(() => T.Comment(content)),
    P.alt(() => pipe(C.char('!'), P.apSecond(commentEndBang(content)))),
    P.alt(() => pipe(C.char('-'), P.apSecond(commentEnd(foldS([content, '-']))))),
    P.alt(() =>
      pipe(
        P.eof<string>(),
        P.map(() => T.Comment(content))
      )
    ),
    P.alt(() => comment(foldS([content, '--'])))
  )

const commentStartDash: P.Parser<string, T.Token> = pipe(
  C.char('-'),
  P.apSecond(commentEnd('')),
  P.alt(() =>
    pipe(
      C.char('>'),
      P.map(() => T.Comment(''))
    )
  ),
  P.alt(() =>
    pipe(
      P.eof<string>(),
      P.map(() => T.Comment(''))
    )
  ),
  P.alt(() => comment('-'))
)

const commentStart: P.Parser<string, T.Token> = pipe(
  C.char('-'),
  P.apSecond(commentStartDash),
  P.alt(() =>
    pipe(
      C.char('>'),
      P.map(() => T.Comment(''))
    )
  ),
  P.alt(() => comment(''))
)

const markupDeclOpen: P.Parser<string, T.Token> = pipe(
  S.string('--'),
  P.apSecond(commentStart),
  P.alt(() =>
    pipe(
      RA.replicate(7, P.item<string>()),
      RA.sequence(P.Applicative),
      P.map((chars) => chars.join('')),
      P.filter((s) => s.toLowerCase() === 'doctype'),
      P.apSecond(doctype)
    )
  ),
  P.alt(() => bogusComment(''))
)

const bogusComment = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('>'),
    P.map(() => T.Comment(content)),
    P.alt(() =>
      pipe(
        P.eof<string>(),
        P.map(() => T.Comment(content))
      )
    ),
    P.alt(() => pipe(C.char('\u0000'), P.apSecond(bogusComment(`${content}\ufffd`)))),
    P.alt(() =>
      pipe(
        P.item<string>(),
        P.chain((c) => bogusComment(content + c))
      )
    )
  )

const tagOpen: P.Parser<string, T.Token> = pipe(
  C.char('!'),
  P.apSecond(markupDeclOpen),
  P.alt(() => pipe(C.char('/'), P.apSecond(tagNameClose))),
  P.alt(() => pipe(C.char('?'), P.apSecond(bogusComment('')))),
  P.alt(() => tagNameOpen),
  P.alt(() => P.succeed(T.ContentChar('<')))
)

const tagName: P.Parser<string, string> = S.many(P.either(C.letter, () => C.notOneOf('/<>\n\r\t ')))

const tagNameOpen: P.Parser<string, T.Token> = pipe(
  tagName,
  P.chain((name) =>
    pipe(
      C.space,
      P.apSecond(beforeAttrName(name, [])),
      P.alt(() => pipe(C.char('/'), P.apSecond(selfClosingStartTag(name, [])))),
      P.alt(() =>
        pipe(
          C.char('>'),
          P.map(() => T.TagOpen(name, []))
        )
      )
    )
  )
)

const tagNameClose: P.Parser<string, T.Token> = pipe(
  tagName,
  P.apFirst(C.char('>')),
  P.map(T.TagClose)
)

const selfClosingStartTag = (
  name: string,
  attributes: ReadonlyArray<T.Attribute>
): P.Parser<string, T.Token> =>
  pipe(
    C.char('>'),
    P.map(() => T.TagSelfClose(name, attributes)),
    P.alt(() => pipe(P.eof<string>(), P.map(endOfFileToken))),
    P.alt(() => beforeAttrName(name, attributes))
  )

const beforeAttrName = (
  name: string,
  attributes: ReadonlyArray<T.Attribute>
): P.Parser<string, T.Token> =>
  pipe(
    S.spaces,
    P.chain(() =>
      pipe(
        C.char('/'),
        P.apSecond(selfClosingStartTag(name, attributes)),
        P.alt(() =>
          pipe(
            C.char('>'),
            P.map(() => T.TagOpen(name, attributes))
          )
        ),
        P.alt(() => attrName(name, attributes))
      )
    )
  )

const attrName = (
  name: string,
  attributes: ReadonlyArray<T.Attribute>
): P.Parser<string, T.Token> =>
  pipe(
    S.many(C.notOneOf('/=>\n\r\t ')),
    P.chain((tag) =>
      pipe(
        P.eof<string>(),
        P.chain(() => afterAttrName(name, attributes, tag)),
        P.alt(() => pipe(C.char('='), P.apSecond(beforeAttrValue(name, attributes, tag)))),
        P.alt(() => pipe(C.notOneOf('/>\n\r\t'), P.apSecond(afterAttrName(name, attributes, tag))))
      )
    )
  )

const afterAttrName = (
  tag: string,
  attributes: ReadonlyArray<T.Attribute>,
  key: string
): P.Parser<string, T.Token> =>
  pipe(
    S.spaces,
    P.chain(() =>
      pipe(
        C.char('/'),
        P.apSecond(selfClosingStartTag(tag, attributes)),
        P.alt(() => pipe(C.char('='), P.apSecond(beforeAttrValue(tag, attributes, key)))),
        P.alt(() =>
          pipe(
            C.char('>'),
            P.map(() => T.TagOpen(tag, pipe(attributes, RA.cons(T.Attribute(key, '')))))
          )
        ),
        P.alt(() => pipe(P.eof<string>(), P.map(endOfFileToken))),
        P.alt(() => attrName(tag, pipe(attributes, RA.cons(T.Attribute(key, '')))))
      )
    )
  )

const beforeAttrValue = (
  tag: string,
  attributes: ReadonlyArray<T.Attribute>,
  key: string
): P.Parser<string, T.Token> =>
  pipe(
    S.spaces,
    P.chain(() =>
      pipe(
        C.char('"'),
        P.apSecond(attrValueDQuoted(tag, attributes, key)),
        P.alt(() => pipe(C.char("'"), P.apSecond(attrValueSQuoted(tag, attributes, key)))),
        P.alt(() =>
          pipe(
            C.char('>'),
            P.map(() => T.TagOpen(tag, pipe(attributes, RA.cons(T.Attribute(key, '')))))
          )
        ),
        P.alt(() => attrValueUnquoted(tag, attributes, key))
      )
    )
  )

const attrValueDQuoted = (
  tag: string,
  attributes: ReadonlyArray<T.Attribute>,
  key: string
): P.Parser<string, T.Token> =>
  pipe(
    C.many(C.notChar('"')),
    P.apFirst(C.char('"')),
    P.chain((value) => afterAttrValueQuoted(tag, attributes, key, value))
  )

const attrValueSQuoted = (
  tag: string,
  attributes: ReadonlyArray<T.Attribute>,
  key: string
): P.Parser<string, T.Token> =>
  pipe(
    C.many(C.notChar("'")),
    P.apFirst(C.char("'")),
    P.chain((value) => afterAttrValueQuoted(tag, attributes, key, value))
  )

const attrValueUnquoted = (
  tag: string,
  attributes: ReadonlyArray<T.Attribute>,
  key: string
): P.Parser<string, T.Token> =>
  pipe(
    C.many(C.notChar('>\n\r\t ')),
    P.chain((value) =>
      pipe(
        S.spaces,
        P.apSecond(beforeAttrName(tag, attributes)),
        P.alt(() =>
          pipe(
            C.char('>'),
            P.map(() => T.TagOpen(tag, pipe(attributes, RA.cons(T.Attribute(key, value)))))
          )
        ),
        P.alt(() => pipe(P.eof<string>(), P.map(endOfFileToken)))
      )
    )
  )

const afterAttrValueQuoted = (
  tag: string,
  attributes: ReadonlyArray<T.Attribute>,
  key: string,
  value: string
): P.Parser<string, T.Token> => {
  const attrs = pipe(attributes, RA.cons(T.Attribute(key, value)))
  return pipe(
    S.spaces,
    P.apSecond(beforeAttrName(tag, attrs)),
    P.alt(() => pipe(C.char('/'), P.apSecond(selfClosingStartTag(tag, attrs)))),
    P.alt(() =>
      pipe(
        C.char('>'),
        P.map(() => T.TagOpen(tag, attrs))
      )
    ),
    P.alt(() => pipe(P.eof<string>(), P.map(endOfFileToken)))
  )
}

const comment = (content0: string): P.Parser<string, T.Token> =>
  pipe(
    C.many(C.notOneOf('-\u0000<')),
    P.chain((content) =>
      pipe(
        C.char('<'),
        P.apSecond(commentLessThan(foldS([content0, content, '<']))),
        P.alt(() => pipe(C.char('-'), P.apSecond(commentEndDash(foldS([content0, content]))))),
        P.alt(() =>
          pipe(C.char('\u0000'), P.apSecond(comment(foldS([content0, content, '\ufffd']))))
        ),
        P.alt(() =>
          pipe(
            P.eof<string>(),
            P.map(() => T.Comment(foldS([content0, content])))
          )
        )
      )
    )
  )

const commentLessThan = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('!'),
    P.apSecond(commentLessThanBang(foldS([content, '!']))),
    P.alt(() => pipe(C.char('<'), P.apSecond(commentLessThan(foldS([content, '<']))))),
    P.alt(() => comment(content))
  )

const commentLessThanBang = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('-'),
    P.apSecond(commentLessThanBangDash(content)),
    P.alt(() => comment(content))
  )

const commentLessThanBangDash = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('-'),
    P.apSecond(commentLessThanBangDashDash(content)),
    P.alt(() => commentEndDash(content))
  )

const commentLessThanBangDashDash = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('>'),
    P.apSecond(comment(content)),
    P.alt(() => pipe(P.eof<string>(), P.apSecond(comment(content)))),
    P.alt(() => commentEnd(content))
  )

const commentEndDash = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('-'),
    P.apSecond(commentEnd(content)),
    P.alt(() =>
      pipe(
        P.eof<string>(),
        P.map(() => T.Comment(content))
      )
    ),
    P.alt(() => comment(foldS([content, '-'])))
  )

const commentEndBang = (content: string): P.Parser<string, T.Token> =>
  pipe(
    C.char('-'),
    P.apSecond(commentEndDash(foldS([content, '--!']))),
    P.alt(() =>
      pipe(
        C.char('>'),
        P.map(() => T.Comment(content))
      )
    ),
    P.alt(() =>
      pipe(
        P.eof<string>(),
        P.map(() => T.Comment(content))
      )
    ),
    P.alt(() => comment(foldS([content, '--!'])))
  )

const doctype: P.Parser<string, T.Token> = pipe(
  C.many(C.notChar('>')),
  P.apFirst(C.char('>')),
  P.map(T.Doctype)
)

/**
 * @category parsers
 * @since 0.0.1
 */
export const parse: P.Parser<string, ReadonlyArray<T.Token>> = P.many(dataState)
