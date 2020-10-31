import * as C from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import { pipe } from 'fp-ts/function'

import * as Select from '../src/Select'
import * as S from '../src/Scraper'
import { parse } from '../src/Internal/Html/Tokenizer'

const exampleHTML = `
<html>
    <body>
        <div class="comments">
            <div class="comment container">
                <span class="comment author">Sally</span>
                <div class="comment text">Woo hoo!</div>
            </div>
            <div class="comment container">
                <span class="comment author">Bill</span>
                <img class="comment image" src="http://example.com/cat.gif" />
            </div>
            <div class="comment container">
                <span class="comment author">Bertrand</span>
                <div class="comment text">That sure is some cat!</div>
            </div>
            <div class="comment container">
                <span class="comment author">Susan</span>
                <div class="comment text">WTF!?!</div>
            </div>
        </div>
    </body>
</html>
`

import Scraper = S.Scraper

type Author = string

type Comment = TextComment | ImageComment

interface TextComment {
  readonly _tag: 'TextComment'
  readonly author: Author
  readonly text: string
}

interface ImageComment {
  readonly _tag: 'ImageComment'
  readonly author: Author
  readonly url: string
}

const textComment: Scraper<Comment> = pipe(
  S.of('TextComment' as const),
  S.bindTo('_tag'),
  S.bind('author', () => S.text(Select.withAttributes('span', [Select.hasClass('author')]))),
  S.bind('text', () => S.text(Select.withAttributes('div', [Select.hasClass('text')])))
)

const imageComment: Scraper<Comment> = pipe(
  S.of('ImageComment' as const),
  S.bindTo('_tag'),
  S.bind('author', () => S.text(Select.withAttributes('span', [Select.hasClass('author')]))),
  S.bind('url', () => S.attr('src', Select.withAttributes('img', [Select.hasClass('image')])))
)

const comment: Scraper<Comment> = pipe(
  textComment,
  S.alt(() => imageComment)
)

const comments: Scraper<ReadonlyArray<Comment>> = pipe(
  comment,
  S.chroots(Select.withAttributes('div', [Select.hasClass('container')]))
)

const main: IO.IO<void> = pipe(
  parse(exampleHTML),
  IOE.fromEither,
  IOE.mapLeft(() => 'Unable to parse HTML'),
  IOE.chain((tokens) =>
    pipe(
      tokens,
      S.scrape(comments),
      IOE.fromOption(() => 'Unable to scrape HTML')
    )
  ),
  IOE.fold(C.error, C.log)
)

main()
