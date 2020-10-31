/**
 * @since 0.0.1
 */
import type { ReaderTask } from 'fp-ts/ReaderTask'
import * as RT from 'fp-ts/ReaderTask'
import * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.0.1
 */
export type Decoder<A> = ReaderTask<Response, A>

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const arrayBuffer: Decoder<ArrayBuffer> = pipe(
  RT.ask<Response>(),
  RT.chainTaskK((res) => () => res.arrayBuffer())
)

/**
 * @category constructors
 * @since 0.0.1
 */
export const blob: Decoder<Blob> = pipe(
  RT.ask<Response>(),
  RT.chainTaskK((res) => () => res.blob())
)

/**
 * @category constructors
 * @since 0.0.1
 */
export const formData: Decoder<FormData> = pipe(
  RT.ask<Response>(),
  RT.chainTaskK((res) => () => res.formData())
)

/**
 * @category constructors
 * @since 0.0.1
 */
export const json: Decoder<JSON> = pipe(
  RT.ask<Response>(),
  RT.chainTaskK((res) => () => res.json())
)

/**
 * @category constructors
 * @since 0.0.1
 */
export const raw: Decoder<Response> = RT.ask<Response>()

/**
 * @category constructors
 * @since 0.0.1
 */
export const text: Decoder<string> = pipe(
  RT.ask<Response>(),
  RT.chainTaskK((res) => () => res.text())
)

/**
 * @category constructors
 * @since 0.0.1
 */
export const never: Decoder<void> = pipe(
  RT.ask<Response>(),
  RT.chainTaskK(() => T.of(undefined))
)
