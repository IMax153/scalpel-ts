import type { Either } from 'fp-ts/Either'
import { deepStrictEqual } from 'assert'
import { pipe } from 'fp-ts/function'

import type { Scraper } from '../src/Scraper'
import { scrapeRaw } from '../src/Fetch'

export const scrapeTest = <E = never, A = never>(
  html: string,
  expected: Either<E, A>,
  scraper: Scraper<A>
): void => {
  const actual = pipe(scraper, scrapeRaw(html))
  deepStrictEqual(actual, expected)
}
