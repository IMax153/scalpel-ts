/**
 * @since 0.0.1
 */
import type { Option } from 'fp-ts/Option'
import type { TaskEither } from 'fp-ts/TaskEither'
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as O from 'fp-ts/Option'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

import type { Decoder } from './Internal/Fetch/Decoder'
import type { FetchError } from './Internal/Fetch/FetchError'
import * as FE from './Internal/Fetch/FetchError'
import * as D from './Internal/Fetch/Decoder'

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
 * Represents an asynchronous computation that either returns a value of type `A`
 * or fails yielding an error of type `FetchError<E>`.
 *
 * @category model
 * @since 0.0.1
 */
export type Fetch<E, A> = ReaderTaskEither<FetchOptions<E, A>, FetchError<E>, A>

/**
 * Represents the result of a fetch operation which is a Promise that can resolve
 * to either a value of type `A` or an error of type `FetchError<E>`.
 *
 * @category model
 * @since 0.0.1
 */
export type FetchResult<E, A> = TaskEither<FetchError<E>, A>

/**
 * Represents options that can be used to create a fetch operation.
 *
 * @category model
 * @since 0.0.1
 */
export interface FetchOptions<E, A> {
  /**
   * An implementation of the fetch API to utilize.
   */
  readonly fetch: GlobalFetch
  /**
   * A decoder for a fetch error.
   */
  readonly errorDecoder: Decoder<E>
  /**
   * A decoder for a fetch response.
   */
  readonly responseDecoder: Decoder<A>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const fetchOptions = <E, A>(
  fetch: GlobalFetch,
  errorDecoder: Decoder<E>,
  responseDecoder: Decoder<A>
): FetchOptions<E, A> => ({
  fetch,
  errorDecoder,
  responseDecoder
})

/**
 * Constructs a fetch operation which can be provided custom `FetchOptions`.
 *
 * @category constructors
 * @since 0.0.1
 */
export const custom = <E, A>(url: RequestInfo, init?: RequestInit): Fetch<E, A> =>
  pipe(
    RTE.ask<FetchOptions<E, A>>(),
    RTE.chain<FetchOptions<E, A>, FetchError<E>, FetchOptions<E, A>, A>((opts) =>
      pipe(
        TE.tryCatch(
          () => opts.fetch(url, init),
          (err) => FE.NetworkError((err as Error).message)
        ),
        RTE.fromTaskEither,
        RTE.chainTaskEitherK((response) =>
          response.ok
            ? onSuccess(response, opts.responseDecoder)
            : onFailure(response, opts.errorDecoder)
        )
      )
    )
  )

/**
 * Constructs a fetch operation which returns the raw `Response` object.
 *
 * @category constructors
 * @since 0.0.1
 */
export const raw = (url: RequestInfo, init?: RequestInit): FetchResult<Response, Response> =>
  pipe(fetchOptions(globalThis.fetch, D.raw, D.raw), custom(url, init))

/**
 * Constructs a fetch operation which returns the `Response` object decoded
 * as a JSON object.
 *
 * @category constructors
 * @since 0.0.1
 */
export const json = (url: RequestInfo, init?: RequestInit): FetchResult<JSON, JSON> =>
  pipe(fetchOptions(globalThis.fetch, D.json, D.json), custom(url, init))

/**
 * Constructs a fetch operation which returns the `Response` object decoded
 * as text.
 *
 * @category constructors
 * @since 0.0.1
 */
export const text = (url: RequestInfo, init?: RequestInit): FetchResult<string, string> =>
  pipe(fetchOptions(globalThis.fetch, D.text, D.text), custom(url, init))

/**
 * Constructs a fetch operation which discards the `Response` object body.
 * Useful for checking if a fetch operation executed successfully (i.e.
 * returned a 200 status code).
 *
 * @category constructors
 * @since 0.0.1
 */
export const never = (url: RequestInfo, init?: RequestInit): FetchResult<void, void> =>
  pipe(fetchOptions(globalThis.fetch, D.never, D.never), custom(url, init))

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * @category utils
 * @since 0.0.1
 */
export const foldError: <E, R>(patterns: {
  readonly NetworkError: (message: string) => R
  readonly DecodeError: (message: string) => R
  readonly ResponseError: (
    message: string,
    status: number,
    body: Option<E>,
    decodeError: Option<FE.DecodeError>
  ) => R
}) => (error: FetchError<E>) => R = FE.fold

const onSuccess = <E, A>(response: Response, decoder: Decoder<A>): FetchResult<E, A> =>
  TE.tryCatch(decoder(response), (err) => FE.DecodeError((err as Error).message))

const onFailure = <E, A>(response: Response, decoder: Decoder<E>): FetchResult<E, A> =>
  pipe(
    TE.tryCatch(
      pipe(
        decoder(response),
        T.map((body) =>
          FE.ResponseError(response.statusText, response.status, O.some(body), O.none)
        )
      ),
      (err) =>
        FE.ResponseError(
          response.statusText,
          response.status,
          O.none,
          O.some(FE.DecodeError((err as Error).message) as FE.DecodeError)
        )
    ),
    TE.chain(TE.left)
  )
