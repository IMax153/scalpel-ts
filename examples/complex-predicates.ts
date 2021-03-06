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

const catComment: Scraper<string> = pipe(
  // 2. The `any` selector can be used to access the root tag of the current context
  Scrape.text(Select.any),
  // 3. Skip any comment divs that do not contain the word "cat"
  Scrape.filter((content) => content.includes('cat')),
  // 4. Generate the desired return value
  Scrape.chain(() => Scrape.html(Select.any)),
  // 1. Narrow the current context to the div containing the comment's textual content
  Scrape.chroot(Select.withAttributes('div', [Select.hasClass('comment'), Select.hasClass('text')]))
)

const main: IO.IO<void> = pipe(
  catComment,
  F.scrapeRaw(exampleHTML),
  IOE.fromEither,
  IOE.fold(C.error, C.log)
)

main()
