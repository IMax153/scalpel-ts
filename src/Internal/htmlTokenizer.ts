import * as Context from "@effect/data/Context"
import * as Layer from "@effect/io/Layer"
import type * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as Stream from "@effect/stream/Stream"
import { Parser } from "htmlparser2"

/** @internal */
export const Tag = Context.Tag<HtmlTokenizer.HtmlTokenizer>()

/** @internal */
export const tagOpen = (
  name: string,
  attributes: ReadonlyArray<HtmlTokenizer.Attribute> = []
): HtmlTokenizer.HtmlToken => ({
  _tag: "TagOpen",
  name,
  attributes
})

/** @internal */
export const tagClose = (name: string): HtmlTokenizer.HtmlToken => ({
  _tag: "TagClose",
  name
})

/** @internal */
export const text = (text: string): HtmlTokenizer.HtmlToken => ({
  _tag: "Text",
  text
})

/** @internal */
export const comment = (comment: string): HtmlTokenizer.HtmlToken => ({
  _tag: "Comment",
  comment
})

/** @internal */
export const attribute = (key: string, value: string): HtmlTokenizer.Attribute => ({
  key,
  value
})

export const layer: Layer.Layer<never, never, HtmlTokenizer.HtmlTokenizer> = Layer.succeed(
  Tag,
  Tag.of({
    tokenize: (html: string): Stream.Stream<never, Error, HtmlTokenizer.HtmlToken> =>
      Stream.async<never, Error, HtmlTokenizer.HtmlToken>((emit) => {
        // Track the starting and ending index of the parser so that
        // self-closing tags can be recognized
        let startIndex: number | undefined = undefined
        let endIndex: number | undefined = undefined
        const parser = new Parser(
          {
            onopentag: (name, attrs) => {
              startIndex = parser.startIndex
              endIndex = parser.endIndex
              const attributes = Object.entries(attrs).map(([key, value]) => attribute(key, value))
              const token = tagOpen(name, attributes)
              emit.single(token)
            },
            onclosetag: (name) => {
              // If the starting and ending index of the parser are
              // exactly equal to what they were in the previous opening
              // tag, then `onclosetag` is being called for a self-closing
              // tag and we can ignore it
              if (parser.startIndex === startIndex && parser.endIndex === endIndex) {
                return
              }
              const token = tagClose(name)
              emit.single(token)
            },
            ontext: (content) => {
              if (content.length === 0) {
                return
              }
              const token = text(content)
              emit.single(token)
            },
            oncomment: (content) => {
              const token = comment(content)
              emit.single(token)
            },
            onerror: (error) => {
              emit.fail(error)
            },
            onend: () => {
              emit.end()
            }
          },
          { recognizeSelfClosing: true }
        )
        parser.parseComplete(html)
        parser.end()
      })
  })
)

/** @internal */
export const tokenize = (html: string): Stream.Stream<HtmlTokenizer.HtmlTokenizer, Error, HtmlTokenizer.HtmlToken> =>
  Stream.flatMap(Tag, (tokenizer) => tokenizer.tokenize(html))

// const showAttribute: Show<Attribute> = {
//   show: ({ key, value }) => ` ${key}="${value}"`
// }

// /**
//  * @category instances
//  * @since 0.0.1
//  */
// export const showToken: Show<Token> = {
//   show: fold({
//     TagOpen: (name, attrs) => `<${name}${RA.foldMap(M.monoidString)(showAttribute.show)(attrs)}>`,
//     TagClose: (name) => `</${name}>`,
//     Text: identity,
//     Comment: (comment) => `<!--${comment}-->`
//   })
// }
