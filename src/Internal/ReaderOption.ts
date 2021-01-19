/**
 * @since 0.0.1
 */
import type { Alt2 } from 'fp-ts/Alt'
import type { Alternative2 } from 'fp-ts/Alternative'
import type { Applicative2 } from 'fp-ts/Applicative'
import type { Apply2 } from 'fp-ts/Apply'
import type { Compactable2, Separated } from 'fp-ts/Compactable'
import type { Either } from 'fp-ts/Either'
import type { Filter2, Filterable2, Partition2 } from 'fp-ts/Filterable'
import type { Functor2 } from 'fp-ts/Functor'
import type { Monad2 } from 'fp-ts/Monad'
import type { Option } from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import { identity, flow, not, pipe, Lazy, Predicate, Refinement } from 'fp-ts/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.0.1
 */
export interface ReaderOption<R, A> {
  (r: R): Option<A>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const none: ReaderOption<any, never> = R.of(O.none)

/**
 * @category constructors
 * @since 0.0.1
 */
export const some: <R, A>(a: A) => ReaderOption<R, A> = flow(O.some, R.of)

/**
 * @category constructors
 * @since 0.0.1
 */
export const ask: <R>() => ReaderOption<R, R> = () => O.of

/**
 * @category constructors
 * @since 0.0.1
 */
export const asks: <R, A>(f: (r: R) => A) => ReaderOption<R, A> = (f) => flow(f, O.some)

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromOption: <R, A>(ma: Option<A>) => ReaderOption<R, A> =
  /* #__PURE__ */
  R.of

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromReader: <R, A>(ma: Reader<R, A>) => ReaderOption<R, A> =
  /* #__PURE__ */
  R.map(O.of)

/**
 * @category constructors
 * @since 0.0.1
 */
export const fromPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): <U>(a: A) => ReaderOption<U, B>
  <A>(predicate: Predicate<A>): <R>(a: A) => ReaderOption<R, A>
} = <A>(predicate: Predicate<A>) => (a: A) => (predicate(a) ? some(a) : none)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.0.1
 */
export const fold: <R, A, B>(
  onNone: Lazy<Reader<R, B>>,
  onSome: (a: A) => Reader<R, B>
) => (ma: ReaderOption<R, A>) => Reader<R, B> =
  /* #__PURE__ */
  flow(O.fold, R.chain)

/**
 * @category destructors
 * @since 0.0.1
 */
export const getOrElseW = <R, B>(onNone: Lazy<Reader<R, B>>) => <Q, A>(
  ma: ReaderOption<Q, A>
): Reader<Q & R, A | B> => pipe(ma, R.chain(O.fold<A, R.Reader<Q & R, A | B>>(onNone, R.of)))

/**
 * @category destructors
 * @since 0.0.1
 */
export const getOrElse: <R, A>(
  onNone: Lazy<Reader<R, A>>
) => (ma: ReaderOption<R, A>) => Reader<R, A> = getOrElseW

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 0.0.1
 */
export const fromOptionK: <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Option<B>
) => <R>(...a: A) => ReaderOption<R, B> = (f) => (...a) => fromOption(f(...a))

/**
 * @category combinators
 * @since 0.0.1
 */
export const chainOptionK: <A, B>(
  f: (a: A) => Option<B>
) => <R>(ma: ReaderOption<R, A>) => ReaderOption<R, B> = (f) => chain((a) => fromOption(f(a)))

// -------------------------------------------------------------------------------------
// non-pipeables
// -------------------------------------------------------------------------------------

const map_: Functor2<URI>['map'] = (fa, f) => pipe(fa, map(f))
const ap_: Apply2<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))
const chain_: Monad2<URI>['chain'] = (ma, f) => pipe(ma, chain(f))
const alt_: Alternative2<URI>['alt'] = (fa, that) => pipe(fa, alt(that))
const filter_: Filter2<URI> = <R, A>(fa: ReaderOption<R, A>, f: Predicate<A>): ReaderOption<R, A> =>
  pipe(fa, filter(f))
const filterMap_: Filterable2<URI>['filterMap'] = (fa, f) => pipe(fa, filterMap(f))
const partition_: Partition2<URI> = <R, A>(
  fa: ReaderOption<R, A>,
  f: Predicate<A>
): Separated<ReaderOption<R, A>, ReaderOption<R, A>> => pipe(fa, partition(f))
const partitionMap_: Filterable2<URI>['partitionMap'] = (fa, f) => pipe(fa, partitionMap(f))

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @category Functor
 * @since 0.0.1
 */
export const map: <A, B>(f: (a: A) => B) => <R>(fa: ReaderOption<R, A>) => ReaderOption<R, B> = (
  f
) => R.map(O.map(f))

/**
 * @category Apply
 * @since 0.0.1
 */
export const ap = <R, A>(
  fa: ReaderOption<R, A>
): (<B>(fab: ReaderOption<R, (a: A) => B>) => ReaderOption<R, B>) =>
  flow(
    R.map((gab) => (ga: Option<A>) => O.ap(ga)(gab)),
    R.ap(fa)
  )

/**
 * @category Apply
 * @since 0.0.1
 */
export const apFirst = <R, B>(
  fb: ReaderOption<R, B>
): (<A>(fa: ReaderOption<R, A>) => ReaderOption<R, A>) =>
  flow(
    map((a) => () => a),
    ap(fb)
  )

/**
 * @category Apply
 * @since 0.0.1
 */
export const apSecond = <R, B>(
  fb: ReaderOption<R, B>
): (<A>(fa: ReaderOption<R, A>) => ReaderOption<R, B>) =>
  flow(
    map(() => (b: B) => b),
    ap(fb)
  )

/**
 * @category Monad
 * @since 0.0.1
 */
export const chain = <R, A, B>(f: (a: A) => ReaderOption<R, B>) => (
  ma: ReaderOption<R, A>
): ReaderOption<R, B> => pipe(ma, R.chain(O.fold<A, ReaderOption<R, B>>(() => none, f)))

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
  f: (a: A) => ReaderOption<R, B>
) => (ma: ReaderOption<R, A>) => ReaderOption<R, A> = (f) =>
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
export const flatten: <R, A>(mma: ReaderOption<R, ReaderOption<R, A>>) => ReaderOption<R, A> =
  /* #__PURE__ */
  chain(identity)

/**
 * @category Alternative
 * @since 0.0.1
 */
export const alt: <R, A>(
  that: Lazy<ReaderOption<R, A>>
) => (fa: ReaderOption<R, A>) => ReaderOption<R, A> = (that) => R.chain(O.fold(that, some))

/**
 * @category Alternative
 * @since 0.0.1
 */
export const zero: Alternative2<URI>['zero'] = () => none

/**
 * @category Compactable
 * @since 0.0.1
 */
export const compact: <R, A>(fa: ReaderOption<R, Option<A>>) => ReaderOption<R, A> = R.map(
  O.compact
)

/**
 * @category Compactable
 * @since 0.0.1
 */
export const separate: <R, A, B>(
  ma: ReaderOption<R, Either<A, B>>
) => Separated<ReaderOption<R, A>, ReaderOption<R, B>> = (ma) => {
  const left = pipe(ma, map(O.getLeft), compact)
  const right = pipe(ma, map(O.getRight), compact)
  return { left, right }
}
/**
 * @category Filterable
 * @since 0.0.1
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <R>(fa: ReaderOption<R, A>) => ReaderOption<R, B>
  <A>(predicate: Predicate<A>): <R>(fa: ReaderOption<R, A>) => ReaderOption<R, A>
} = <A>(f: Predicate<A>) => <R>(fa: ReaderOption<R, A>): ReaderOption<R, A> =>
  pipe(fa, R.map(O.filter(f)))

/**
 * @category Filterable
 * @since 0.0.1
 */
export const filterMap: <R, A, B>(
  f: (a: A) => Option<B>
) => (fa: ReaderOption<R, A>) => ReaderOption<R, B> = (f) => (fa) => pipe(fa, R.map(O.filterMap(f)))

/**
 * @category Filterable
 * @since 0.0.1
 */
export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <R>(
    fa: ReaderOption<R, A>
  ) => Separated<ReaderOption<R, A>, ReaderOption<R, B>>
  <A>(predicate: Predicate<A>): <R>(
    fa: ReaderOption<R, A>
  ) => Separated<ReaderOption<R, A>, ReaderOption<R, A>>
} = <A>(f: Predicate<A>) => <R>(
  fa: ReaderOption<R, A>
): Separated<ReaderOption<R, A>, ReaderOption<R, A>> => {
  const left = pipe(fa, filter(not(f)))
  const right = pipe(fa, filter(f))
  return { left, right }
}

/**
 * @category Filterable
 * @since 0.0.1
 */
export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <R>(fa: ReaderOption<R, A>) => Separated<ReaderOption<R, B>, ReaderOption<R, C>> = (f) => (
  fa
) => {
  const left = pipe(fa, filterMap(flow(f, O.getLeft)))
  const right = pipe(fa, filterMap(flow(f, O.getRight)))
  return { left, right }
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.0.1
 */
export const URI = 'ReaderOption'

/**
 * @category instances
 * @since 0.0.1
 */
export type URI = typeof URI

declare module 'fp-ts/HKT' {
  interface URItoKind2<E, A> {
    readonly [URI]: ReaderOption<E, A>
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

/**
 * @category instances
 * @since 0.0.1
 */
export const Compactable: Compactable2<URI> = {
  URI,
  compact,
  separate
}

/**
 * @category instances
 * @since 0.0.1
 */
export const Filterable: Filterable2<URI> = {
  URI,
  map: map_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_
}

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @category do notation
 * @since 0.0.1
 */
export const bindTo = <N extends string>(
  name: N
): (<R, A>(fa: ReaderOption<R, A>) => ReaderOption<R, { [K in N]: A }>) =>
  map((b) => ({ [name]: b } as any))

/**
 * @category do notation
 * @since 0.0.1
 */
export const bind = <N extends string, R, A, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => ReaderOption<R, B>
): ((
  fa: ReaderOption<R, A>
) => ReaderOption<R, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
  chain((a) =>
    pipe(
      f(a),
      map((b) => ({ ...a, [name]: b } as any))
    )
  )
