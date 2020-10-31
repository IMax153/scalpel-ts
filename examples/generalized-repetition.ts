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
                <img alt="A cat picture." class="comment image" src="http://example.com/cat.gif" />
            </div>
            <div class="comment container">
                <span class="comment author">Susan</span>
                <div class="comment text">WTF!?!</div>
            </div>
            <div class="comment container">
                <span class="comment author">Bill</span>
                <img alt="A dog picture." class="comment image" src="http://example.com/dog.gif" />
            </div>
        </div>
    </body>
</html>
`

import Scraper = S.Scraper

export interface ImageAttributes {
  readonly altText: string
  readonly url: string
}

const imageAttributes: Scraper<ReadonlyArray<ImageAttributes>> = pipe(
  // Use the `any` combinator to select all the relevant content (i.e. the alt text and the src)
  // from the currently selected img tag.
  S.attr('alt', Select.any),
  S.bindTo('altText'),
  S.bind('url', () => S.attr('src', Select.any)),
  S.chroots(Select.tag('img'))
)

const main: IO.IO<void> = pipe(
  parse(exampleHTML),
  IOE.fromEither,
  IOE.mapLeft(() => 'Unable to parse HTML'),
  IOE.chain((tokens) =>
    pipe(
      tokens,
      S.scrape(imageAttributes),
      IOE.fromOption(() => 'Unable to scrape HTML')
    )
  ),
  IOE.fold(C.error, C.log)
)

main()
