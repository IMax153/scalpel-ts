import * as C from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import { pipe } from 'fp-ts/function'

import type { Scraper } from '../src/Scraper'
import * as F from '../src/Fetch'
import * as Select from '../src/Select'
import * as Scrape from '../src/Scraper'

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

const textComment: Scraper<Comment> = pipe(
  Scrape.of('TextComment' as const),
  Scrape.bindTo('_tag'),
  Scrape.bind('author', () =>
    Scrape.text(Select.withAttributes('span', [Select.hasClass('author')]))
  ),
  Scrape.bind('text', () => Scrape.text(Select.withAttributes('div', [Select.hasClass('text')])))
)

const imageComment: Scraper<Comment> = pipe(
  Scrape.of('ImageComment' as const),
  Scrape.bindTo('_tag'),
  Scrape.bind('author', () =>
    Scrape.text(Select.withAttributes('span', [Select.hasClass('author')]))
  ),
  Scrape.bind('url', () =>
    Scrape.attr('src', Select.withAttributes('img', [Select.hasClass('image')]))
  )
)

const comment: Scraper<Comment> = pipe(
  textComment,
  Scrape.alt(() => imageComment)
)

const comments: Scraper<ReadonlyArray<Comment>> = pipe(
  comment,
  Scrape.chroots(Select.withAttributes('div', [Select.hasClass('container')]))
)

const main: IO.IO<void> = pipe(
  comments,
  F.scrapeRaw(exampleHTML),
  IOE.fromEither,
  IOE.fold(C.error, C.log)
)

main()
