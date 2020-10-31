import * as C from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import { pipe } from 'fp-ts/function'

import * as Select from '../src/Select'
import * as Scraper from '../src/Scraper'
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

const textComment: Scraper.Scraper<Comment> = pipe(
  Scraper.of('TextComment' as const),
  Scraper.bindTo('_tag'),
  Scraper.bind('author', () =>
    Scraper.text(Select.withAttributes('span', [Select.hasClass('author')]))
  ),
  Scraper.bind('text', () => Scraper.text(Select.withAttributes('div', [Select.hasClass('text')])))
)

const imageComment: Scraper.Scraper<Comment> = pipe(
  Scraper.of('ImageComment' as const),
  Scraper.bindTo('_tag'),
  Scraper.bind('author', () =>
    Scraper.text(Select.withAttributes('span', [Select.hasClass('author')]))
  ),
  Scraper.bind('url', () =>
    Scraper.attr('src', Select.withAttributes('img', [Select.hasClass('image')]))
  )
)

const comment: Scraper.Scraper<Comment> = pipe(
  textComment,
  Scraper.alt(() => imageComment)
)

const comments: Scraper.Scraper<ReadonlyArray<Comment>> = pipe(
  comment,
  Scraper.chroots(Select.withAttributes('div', [Select.hasClass('container')]))
)

const main: IO.IO<void> = pipe(
  parse(exampleHTML),
  IOE.fromEither,
  IOE.mapLeft(() => 'Unable to parse HTML'),
  IOE.chain((tokens) =>
    pipe(
      tokens,
      Scraper.scrape(comments),
      IOE.fromOption(() => 'Unable to scrape HTML')
    )
  ),
  IOE.fold(C.error, C.log)
)

main()
