/**
 * @since 0.0.1
 */
import type { Option } from 'fp-ts/Option'
import * as O from 'fp-ts/Option'
import { absurd } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents an error returned when a fetch operation fails.
 *
 * @category model
 * @since 0.0.1
 */
export type FetchError<E = never> = NetworkError | DecodeError | ResponseError<E>

/**
 * Represents a network failure which prevented the fetch operation from executing
 * successfully.
 *
 * @category model
 * @since 0.0.1
 */
export interface NetworkError {
  readonly _tag: 'NetworkError'
  /**
   * The error message.
   */
  readonly message: string
}

/**
 * Represents a failure to decode the HTTP response body into the desired format.
 *
 * @category model
 * @since 0.0.1
 */
export interface DecodeError {
  readonly _tag: 'DecodeError'
  /**
   * The error message.
   */
  readonly message: string
}

/**
 * Represents a fetch operation which returned an invalid response (i.e. a
 * response without an HTTP status code of 200 (OK)).
 *
 * @category model
 * @since 0.0.1
 */
export interface ResponseError<E = never> {
  readonly _tag: 'ResponseError'
  /**
   * The error message.
   */
  readonly message: string
  /**
   * The response status (i.e. 200 (OK))
   */
  readonly status: number
  /**
   * The body of the response.
   */
  readonly body: Option<E>
  /**
   * The error returned while decoding a response.
   */
  readonly decodeError: Option<DecodeError>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const NetworkError = (message: string): FetchError => ({
  _tag: 'NetworkError',
  message
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const DecodeError = (message: string): FetchError => ({
  _tag: 'DecodeError',
  message
})

/**
 * @category constructors
 * @since 0.0.1
 */
export const ResponseError = <E = never>(
  message: string,
  status: number,
  body: Option<E> = O.none,
  decodeError: Option<DecodeError> = O.none
): FetchError<E> => ({
  _tag: 'ResponseError',
  message,
  status,
  body,
  decodeError
})

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.0.1
 */
export const fold = <E, R>(patterns: {
  readonly NetworkError: (message: string) => R
  readonly DecodeError: (message: string) => R
  readonly ResponseError: (
    message: string,
    status: number,
    body: Option<E>,
    decodeError: Option<DecodeError>
  ) => R
}): ((error: FetchError<E>) => R) => {
  const f = (x: FetchError<E>): R => {
    switch (x._tag) {
      case 'NetworkError':
        return patterns.NetworkError(x.message)
      case 'DecodeError':
        return patterns.DecodeError(x.message)
      case 'ResponseError':
        return patterns.ResponseError(x.message, x.status, x.body, x.decodeError)
      default:
        return absurd<R>(x as never)
    }
  }
  return f
}
