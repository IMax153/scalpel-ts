import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as HtmlTokenizer from "@effect/scraper/HtmlTokenizer"
import * as Scraper from "@effect/scraper/Scraper"
import { expect, it } from "vitest"

export const scrapeTest = <A>(
  name: string,
  source: string,
  expected: A,
  scraper: Scraper.Scraper<A>
) => {
  it(name, () =>
    Effect.runPromise(
      Scraper.scrape(scraper, source).pipe(
        Effect.map((option) => {
          if (Option.isSome(option)) {
            expect(option.value).toEqual(expected)
          }
        }),
        Effect.provideLayer(HtmlTokenizer.layer)
      )
    ))
}
