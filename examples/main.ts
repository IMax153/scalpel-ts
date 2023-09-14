import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as Scraper from "@effect/scraper/Scraper"
import * as Select from "@effect/scraper/Select"

const source = `
<article>
  <p>First paragraph.</p>
  <p>Second paragraph.</p>
  <p>Third paragraph.</p>
</article>
`

const selector = pipe(
  Select.tag("article"),
  Select.nested(Select.tag("p"))
)

const program = Effect.gen(function*($) {
  const index = yield* $(Scraper.position)
  const content = yield* $(Scraper.texts(Select.tag("p")))
  return Option.all({ index, content })
}).pipe(
  Scraper.chroots(selector),
  Scraper.scrape(source),
  Effect.provideLayer(HtmlTokenizer.layer)
)

Effect.runPromise(program).then((result) => console.dir(result, { depth: null }))
