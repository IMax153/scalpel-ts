/**
 * @since 0.0.1
 */
import type { Alt2 } from 'fp-ts/Alt'
import type { Alternative2 } from 'fp-ts/Alternative'
import type { Applicative2 } from 'fp-ts/Applicative'
import type { Apply2 } from 'fp-ts/Apply'
import type { Functor2 } from 'fp-ts/Functor'
import type { Monad2 } from 'fp-ts/Monad'
import * as O from 'fp-ts/Option'
import * as S from 'fp-ts/State'
import { flow, identity, pipe, Lazy } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Option = O.Option

/**
 * @category model
 * @since 0.0.1
 */
export interface StateOption<S, A> {
  (s: S): [Option<A>, S]
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const none: StateOption<unknown, never> = S.of(O.none)

/**
 * @category constructors
 * @since 0.0.1
 */
export const some: <S, A>(a: A) => StateOption<S, A> = (a) => S.of(O.some(a))

/**
 * @category constructors
 * @since 0.0.1
 */
export const get: <S>() => StateOption<S, S> = () => (s) => [O.some(s), s]

/**
 * @category constructors
 * @since 0.0.1
 */
export const put: <S>(s: S) => StateOption<S, void> = (s) => () => [O.some(undefined), s]

/**
 * @category constructors
 * @since 0.0.1
 */
export const modify: <S>(f: (s: S) => S) => StateOption<S, void> = (f) => (s) => [
  O.some(undefined),
  f(s)
]

/**
 * @category constructors
 * @since 0.0.1
 */
export const gets: <S, A>(f: (s: S) => A) => StateOption<S, A> = (f) => (s) => [O.some(f(s)), s]

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromOption: <S, A>(ma: Option<A>) => StateOption<S, A> = S.of

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 0.0.1
 */
export const fromOptionK: <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Option<B>
) => <S>(...a: A) => StateOption<S, B> = (f) => (...a) => fromOption(f(...a))

/**
 * @category combinators
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
 * @category Functor
 * @since 0.0.1
 */
export const map: <A, B>(f: (a: A) => B) => <S>(fa: StateOption<S, A>) => StateOption<S, B> = (f) =>
  S.map(O.map(f))

/**
 * @category Apply
 * @since 0.0.1
 */
export const ap = <S, A>(
  fa: StateOption<S, A>
): (<B>(fab: StateOption<S, (a: A) => B>) => StateOption<S, B>) =>
  flow(
    S.map((gab) => (ga: O.Option<A>) => O.ap(ga)(gab)),
    S.ap(fa)
  )

/**
 * @category Apply
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
 * @category Apply
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
 * @category Monad
 * @since 0.0.1
 */
export const chain = <S, A, B>(f: (a: A) => StateOption<S, B>) => (
  ma: StateOption<S, A>
): StateOption<S, B> => pipe(ma, S.chain(O.fold<A, StateOption<S, B>>(() => none as any, f)))

/**
 * @category Applicative
 * @since 0.0.1
 */
export const of: Applicative2<URI>['of'] = some

/**
 * @category Monad
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
 * @category Monad
 * @since 0.0.1
 */
export const flatten: <R, A>(mma: StateOption<R, StateOption<R, A>>) => StateOption<R, A> =
  /* #__PURE__ */
  chain(identity)

/**
 * @category Alternative
 * @since 0.0.1
 */
export const alt: <R, A>(
  that: Lazy<StateOption<R, A>>
) => (fa: StateOption<R, A>) => StateOption<R, A> = (that) => S.chain(O.fold(that, some))

/**
 * @category Alternative
 * @since 0.0.1
 */
export const zero: Alternative2<URI>['zero'] = () => none as any

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.0.1
 */
export const URI = 'StateOption'

/**
 * @category instances
 * @since 0.0.1
 */
export type URI = typeof URI

declare module 'fp-ts/HKT' {
  interface URItoKind2<E, A> {
    readonly [URI]: StateOption<E, A>
  }
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Functor: Functor2<URI> = {
  URI,
  map: map_
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Apply: Apply2<URI> = {
  URI,
  map: map_,
  ap: ap_
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Applicative: Applicative2<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of
}

/**
 * @category instances
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
 * @category instances
 * @since 0.0.1
 */
export const Alt: Alt2<URI> = {
  URI,
  map: map_,
  alt: alt_
}

/**
 * @category instances
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
 * @category utils
 * @since 0.0.1
 */
export const evaluate: <S>(s: S) => <A>(ma: StateOption<S, A>) => Option<A> = (s) => (ma) =>
  ma(s)[0]

/**
 * @category utils
 * @since 0.0.1
 */
export const execute: <S>(s: S) => <A>(ma: StateOption<S, A>) => S = (s) => (ma) => ma(s)[1]

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @category do notation
 * @since 0.0.1
 */
export const bindTo = <N extends string>(
  name: N
): (<R, A>(fa: StateOption<R, A>) => StateOption<R, { [K in N]: A }>) =>
  map((b) => ({ [name]: b } as any))

/**
 * @category do notation
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
