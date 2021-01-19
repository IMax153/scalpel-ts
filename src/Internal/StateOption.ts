/**
 * @since 0.0.1
 */
import type { Alt2 } from 'fp-ts/Alt'
import type { Alternative2 } from 'fp-ts/Alternative'
import type { Applicative2 } from 'fp-ts/Applicative'
import type { Apply2 } from 'fp-ts/Apply'
import type { Functor2 } from 'fp-ts/Functor'
import type { Monad2 } from 'fp-ts/Monad'
import type { Option } from 'fp-ts/Option'
import type { State } from 'fp-ts/State'
import * as O from 'fp-ts/Option'
import { flow, identity, pipe, Lazy } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export interface StateOption<S, A> {
  (s: S): Option<[A, S]>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const none: <S, A = never>() => StateOption<S, A> = () => () => O.none

/**
 * @internal
 * @since 0.0.1
 */
export const some: <S, A>(a: A) => StateOption<S, A> = (a) => (s) => O.some([a, s])

/**
 * @internal
 * @since 0.0.1
 */
export const get: <S>() => StateOption<S, S> = () => (s) => O.some([s, s])

/**
 * @internal
 * @since 0.0.1
 */
export const put: <S>(s: S) => StateOption<S, void> = (s) => () => O.some([undefined, s])

/**
 * @internal
 * @since 0.0.1
 */
export const modify: <S>(f: (s: S) => S) => StateOption<S, void> = (f) => (s) =>
  O.some([undefined, f(s)])

/**
 * @internal
 * @since 0.0.1
 */
export const gets: <S, A>(f: (s: S) => A) => StateOption<S, A> = (f) => (s) => O.some([f(s), s])

/**
 * @internal
 * @since 0.0.1
 */
export const fromOption: <S, A>(ma: Option<A>) => StateOption<S, A> =
  /* #__PURE__ */
  O.fold(none, some) as any

/**
 * @internal
 * @since 0.0.1
 */
export const fromState: <S, A>(fa: State<S, A>) => StateOption<S, A> = (fa) => (s) => O.some(fa(s))

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const fromOptionK: <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Option<B>
) => <S>(...a: A) => StateOption<S, B> = (f) => (...a) => fromOption(f(...a))

/**
 * @internal
 * @since 0.0.1
 */
export const chainOptionK: <A, B>(
  f: (a: A) => Option<B>
) => <S>(ma: StateOption<S, A>) => StateOption<S, B> = (f) => chain((a) => fromOption(f(a)))

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const map_: Functor2<URI>['map'] = (fa, f) => pipe(fa, map(f))
const ap_: Apply2<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))
const chain_: Monad2<URI>['chain'] = (ma, f) => pipe(ma, chain(f))
const alt_: Alternative2<URI>['alt'] = (fa, that) => pipe(fa, alt(that))

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const map = <A, B>(f: (a: A) => B) => <S>(fa: StateOption<S, A>): StateOption<S, B> => (
  s1
) =>
  pipe(
    fa(s1),
    O.map(([a, s2]) => [f(a), s2])
  )

/**
 * @internal
 * @since 0.0.1
 */
export const ap = <S, A>(fa: StateOption<S, A>) => <B>(
  fab: StateOption<S, (a: A) => B>
): StateOption<S, B> => (s1) =>
  pipe(
    fab(s1),
    O.chain(([f, s2]) =>
      pipe(
        fa(s2),
        O.map(([a, s3]) => [f(a), s3])
      )
    )
  )

/**
 * @internal
 * @since 0.1.18
 */
export const apFirst = <S, B>(
  fb: StateOption<S, B>
): (<A>(fa: StateOption<S, A>) => StateOption<S, A>) =>
  flow(
    map((a) => () => a),
    ap(fb)
  )

/**
 * @internal
 * @since 0.1.18
 */
export const apSecond = <S, B>(
  fb: StateOption<S, B>
): (<A>(fa: StateOption<S, A>) => StateOption<S, B>) =>
  flow(
    map(() => (b: B) => b),
    ap(fb)
  )

/**
 * @internal
 * @since 0.0.1
 */
export const chain = <S, A, B>(f: (a: A) => StateOption<S, B>) => (
  ma: StateOption<S, A>
): StateOption<S, B> => (s1) =>
  pipe(
    ma(s1),
    O.chain(([a, s2]) => f(a)(s2))
  )

/**
 * @internal
 * @since 0.0.1
 */
export const of: Applicative2<URI>['of'] = some

/**
 * @internal
 * @since 0.0.1
 */
export const chainFirst: <R, A, B>(
  f: (a: A) => StateOption<R, B>
) => (ma: StateOption<R, A>) => StateOption<R, A> = (f) =>
  chain((a) =>
    pipe(
      f(a),
      map(() => a)
    )
  )

/**
 * @internal
 * @since 0.0.1
 */
export const flatten: <R, A>(mma: StateOption<R, StateOption<R, A>>) => StateOption<R, A> =
  /* #__PURE__ */
  chain(identity)

/**
 * @internal
 * @since 0.0.1
 */
export const alt: <R, A>(
  that: Lazy<StateOption<R, A>>
) => (fa: StateOption<R, A>) => StateOption<R, A> = (that) => (fa) => (s) =>
  pipe(
    fa(s),
    O.alt(() => that()(s))
  )

/**
 * @internal
 * @since 0.0.1
 */
export const zero: Alternative2<URI>['zero'] = none

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const URI = 'StateOption'

/**
 * @internal
 * @since 0.0.1
 */
export type URI = typeof URI

declare module 'fp-ts/HKT' {
  interface URItoKind2<E, A> {
    readonly [URI]: StateOption<E, A>
  }
}

/**
 * @internal
 * @since 0.0.1
 */
export const Functor: Functor2<URI> = {
  URI,
  map: map_
}

/**
 * @internal
 * @since 0.0.1
 */
export const Apply: Apply2<URI> = {
  URI,
  map: map_,
  ap: ap_
}

/**
 * @internal
 * @since 0.0.1
 */
export const Applicative: Applicative2<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of
}

/**
 * @internal
 * @since 0.0.1
 */
export const Monad: Monad2<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of,
  chain: chain_
}

/**
 * @internal
 * @since 0.0.1
 */
export const Alt: Alt2<URI> = {
  URI,
  map: map_,
  alt: alt_
}

/**
 * @internal
 * @since 0.0.1
 */
export const Alternative: Alternative2<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of,
  alt: alt_,
  zero
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 0.0.1
 */
export const evaluate: <S>(s: S) => <A>(ma: StateOption<S, A>) => Option<A> = (s) => (ma) =>
  pipe(
    ma(s),
    O.map(([a]) => a)
  )

/**
 * @internal
 * @since 0.0.1
 */
export const execute: <S>(s: S) => <A>(ma: StateOption<S, A>) => Option<S> = (s) => (ma) =>
  pipe(
    ma(s),
    O.map(([, s]) => s)
  )

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @internal notation
 * @since 0.0.1
 */
export const bindTo = <N extends string>(
  name: N
): (<R, A>(fa: StateOption<R, A>) => StateOption<R, { [K in N]: A }>) =>
  map((b) => ({ [name]: b } as any))

/**
 * @internal notation
 * @since 0.0.1
 */
export const bind = <N extends string, R, A, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => StateOption<R, B>
): ((
  fa: StateOption<R, A>
) => StateOption<R, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
  chain((a) =>
    pipe(
      f(a),
      map((b) => ({ ...a, [name]: b } as any))
    )
  )
