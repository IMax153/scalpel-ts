/**
 * **Note**
 *
 * The default behaviour of `scrapeURL` and `fetchTags` is to use the `fetch` implementation
 * provided by the `globalThis` object to download the contents of a remote url. If executing
 * either of these functions in an environment where `globalThis` is undefined, then the
 * `globalThis` object and its `fetch` implementation should be polyfilled. Similarly, if
 * `globalThis` is defined for your environment, but `globalThis.fetch` is not, then the
 * `fetch` implementation for `globalThis` should be polyfilled.
 *
 * Alternatively, an explicit configuration for `fetch` can be provided using the
 * `scrapeURLWithConfig` and/or `fetchTagsWithConfig` functions.
 *
 * @since 0.0.1
 */
import type { Either } from 'fp-ts/Either'
import type { TaskEither } from 'fp-ts/TaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import type { Predicate } from 'fp-ts/function'
import { TextDecoder } from 'util'
import * as E from 'fp-ts/Either'
import * as IOE from 'fp-ts/IOEither'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'

import type { Scraper } from './Scraper'
import type { Token } from './Internal/Html/Tokenizer'
import * as T from './Internal/Html/Tokenizer'
import * as Scrape from './Scraper'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents the type signature for the global fetch API in the browser.
 *
 * @category model
 * @since 0.0.1
 */
export type GlobalFetch = typeof globalThis.fetch

/**
 * Represents a function that reads from an HTTP response and returns the
 * a `Promise` which resolves with the response body as a string.
 *
 * @category model
 * @since 0.0.1
 */
export type ResponseDecoder = ReaderTaskEither<Response, string, string>

/**
 * Represents a configuration object that determines how `scrapeURLWithConfig`
 * interacts with a remote HTTP server and interprets the results.
 *
 * @category model
 * @since 0.0.1
 */
export interface FetchConfig {
  /**
   * An implementation of the fetch API to utilize.
   */
  readonly fetch: GlobalFetch
  /**
   * A decoder that will decode the body of a `Response` as a string.
   */
  readonly decoder: ResponseDecoder
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const FetchConfig = (
  fetch: GlobalFetch,
  decoder: ResponseDecoder = defaultDecoder
): FetchConfig => ({
  fetch,
  decoder
})

// -------------------------------------------------------------------------------------
// decoders
// -------------------------------------------------------------------------------------

/**
 * Checks whether the specified `type` is equivalent to the "content-type" returned
 * by the fetch operation.
 */
const isType: (type: string) => Predicate<string> = (t) => (ct) =>
  ct.toLowerCase().includes(`charset=${t}`)

/**
 * A decoder that will always decode the Response body using 'UTF-8' encoding.
 */
const utf8Decoder: ResponseDecoder = pipe(
  RTE.ask<Response, string>(),
  RTE.chain((res) => RTE.fromTask(() => res.arrayBuffer())),
  RTE.chain((buffer) =>
    RTE.fromEither(
      E.tryCatch(() => new TextDecoder('utf-8', { fatal: true }).decode(buffer), String)
    )
  )
)

/**
 * A decoder that will always decode the Response body using 'ISO-8859-1' encoding.
 */
const iso88591Decoder: ResponseDecoder = pipe(
  RTE.ask<Response, string>(),
  RTE.chain((res) => RTE.fromTask(() => res.arrayBuffer())),
  RTE.chain((buffer) =>
    RTE.fromEither(
      E.tryCatch(() => new TextDecoder('iso-8859-1', { fatal: true }).decode(buffer), String)
    )
  )
)

/**
 * The default `ResponseDecoder`. This decoder will attempt to infer the character
 * set of the HTTP response body from the `Content-Type` header. If the header is
 * not present, the character set is assumed to be `ISO-8859-1`.
 */
const defaultDecoder: ResponseDecoder = pipe(
  RTE.ask<Response, string>(),
  RTE.chain((res) =>
    pipe(
      O.fromNullable(res.headers.get('content-type')),
      O.chain(O.fromPredicate(isType('utf-8'))),
      O.fold(
        () => iso88591Decoder,
        () => utf8Decoder
      )
    )
  )
)

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Parses a raw HTML string into a list of `Token`s.
 *
 * @category utils
 * @since 0.0.1
 */
export const fetchTagsRaw: (html: string) => ReadonlyArray<Token> = T.parse

/**
 * Takes a `FetchConfig` and uses the config object to download the contents of the specified
 * `url` and decode the response body. The decoded response body is then parsed and the
 * resulting list of `Token`s is returned.
 *
 * @category utils
 * @since 0.0.1
 */
export const fetchTagsWithConfig: (
  url: RequestInfo,
  init?: RequestInit
) => ReaderTaskEither<FetchConfig, string, ReadonlyArray<Token>> = (url, init) =>
  pipe(
    RTE.ask<FetchConfig, string>(),
    RTE.chainTaskEitherK((config) =>
      pipe(
        TE.tryCatch(() => config.fetch(url, init), String),
        TE.chain(config.decoder),
        TE.map(fetchTagsRaw)
      )
    )
  )

/**
 * Parses the contents downloaded from the specified `url` into a list of `Token`s.
 *
 * @category utils
 * @since 0.0.1
 */
export const fetchTags: (
  url: RequestInfo,
  init?: RequestInit
) => TaskEither<string, ReadonlyArray<Token>> = (url, init) =>
  pipe(
    TE.fromIOEither<string, GlobalFetch>(IOE.tryCatch(() => globalThis.fetch, String)),
    TE.map((_fetch) => FetchConfig(_fetch, defaultDecoder)),
    TE.chain(fetchTagsWithConfig(url, init))
  )

/**
 * Executes the specified `scraper` on a raw HTML string.
 *
 * @category utils
 * @since 0.0.1
 */
export const scrapeRaw = (html: string) => <A>(scraper: Scraper<A>): Either<string, A> =>
  pipe(
    fetchTagsRaw(html),
    Scrape.scrape(scraper),
    E.fromOption(() => 'Failed to scrape source')
  )

/**
 * Takes a `FetchConfig` and uses the config object to download the contents of the specified
 * `url` and decode the response body. The result of executing the specified `scraper` on the
 * decoded contents is then returned.
 *
 * @category utils
 * @since 0.0.1
 */
export const scrapeURLWithConfig: (
  url: RequestInfo,
  init?: RequestInit
) => <A>(scraper: Scraper<A>) => ReaderTaskEither<FetchConfig, string, A> = (url, init) => (
  scraper
) =>
  pipe(
    RTE.ask<FetchConfig, string>(),
    RTE.chain(() => fetchTagsWithConfig(url, init)),
    RTE.chainEitherK(
      flow(
        Scrape.scrape(scraper),
        E.fromOption(() => 'Failed to scrape source')
      )
    )
  )

/**
 * Executes the specified `scraper` on the contents downloaded from the specified `url`.
 *
 * @category utils
 * @since 0.0.1
 */
export const scrapeURL: (
  url: RequestInfo,
  init?: RequestInit
) => <A>(scraper: Scraper<A>) => TaskEither<string, A> = (url, init) => (scraper) =>
  pipe(
    TE.fromIOEither<string, GlobalFetch>(IOE.tryCatch(() => globalThis.fetch, String)),
    TE.map((_fetch) => FetchConfig(_fetch, defaultDecoder)),
    TE.chain(scrapeURLWithConfig(url, init)(scraper))
  )
