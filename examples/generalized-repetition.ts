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

export interface ImageAttributes {
  readonly altText: string
  readonly url: string
}

const imageAttributes: Scraper<ReadonlyArray<ImageAttributes>> = pipe(
  // Use the `any` combinator to select all the relevant content (i.e. the alt text and the src)
  // from the currently selected img tag.
  Scrape.attr('alt', Select.any),
  Scrape.bindTo('altText'),
  Scrape.bind('url', () => Scrape.attr('src', Select.any)),
  Scrape.chroots(Select.tag('img'))
)

const main: IO.IO<void> = pipe(
  imageAttributes,
  F.scrapeRaw(exampleHTML),
  IOE.fromEither,
  IOE.fold(C.error, C.log)
)

main()
