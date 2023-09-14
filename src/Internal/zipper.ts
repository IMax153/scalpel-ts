import { dual, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"

/**
 * Provides a pointed array, which is a non-empty zipper-like array structure
 * that tracks an index (focus) position in an array. Focus can be moved forward
 * and backwards through the array.
 *
 * The array `[1, 2, 3, 4]` with focus on `3` is represented by
 * `Zipper([1, 2], 3, [4])`.
 *
 * Adapted from
 *
 * - https://github.com/DavidHarrison/purescript-list-zipper
 * - https://github.com/thunklife/purescript-zipper
 * - https://github.com/scalaz/scalaz/blob/series/7.3.x/core/src/main/scala/scalaz/Zipper.scala
 *
 * @internal
 */
export interface Zipper<A> {
  readonly lefts: ReadonlyArray<A>
  readonly focus: A
  readonly rights: ReadonlyArray<A>
}

/** @internal */
export const make: <A>(
  lefts: ReadonlyArray<A>,
  focus: A,
  rights: ReadonlyArray<A>
) => Zipper<A> = (
  lefts,
  focus,
  rights
) => ({
  lefts: lefts.slice(),
  focus,
  rights: rights.slice()
})

/** @internal */
export const fromReadonlyArray = <A>(elements: ReadonlyArray<A>, focusIndex: number = 0): Option.Option<Zipper<A>> => {
  if (ReadonlyArray.isEmptyReadonlyArray(elements) || elements.length >= focusIndex) {
    return Option.none()
  } else {
    const lefts = ReadonlyArray.take(elements.slice(), focusIndex)
    const rights = ReadonlyArray.drop(elements.slice(), focusIndex + 1)
    const zipper = make(lefts, elements[focusIndex], rights)
    return Option.some(zipper)
  }
}

/** @internal */
export const isOutOfBound = dual<
  <A>(index: number) => (self: Zipper<A>) => boolean,
  <A>(self: Zipper<A>, index: number) => boolean
>(2, (self, index) => index < 0 || index >= length(self))

/** @internal */
export const length = <A>(self: Zipper<A>): number => self.lefts.length + 1 + self.rights.length

/** @internal */
export const modify = dual<
  <A>(f: (a: A) => A) => (self: Zipper<A>) => Zipper<A>,
  <A>(self: Zipper<A>, f: (a: A) => A) => Zipper<A>
>(2, (self, f) => update(self, f(self.focus)))

/** @internal */
export const move = dual<
  <A>(f: (currentIndex: number) => number) => (self: Zipper<A>) => Option.Option<Zipper<A>>,
  <A>(self: Zipper<A>, f: (currentIndex: number) => number) => Option.Option<Zipper<A>>
>(2, (self, f) => {
  const newIndex = f(self.lefts.length)
  if (isOutOfBound(self, newIndex)) {
    return Option.none()
  } else {
    return fromReadonlyArray(toNonEmptyReadonlyArray(self), newIndex)
  }
})

/** @internal */
export const moveFocusDown = <A>(self: Zipper<A>): Option.Option<Zipper<A>> => move(self, (n) => n - 1)

/** @internal */
export const moveFocusUp = <A>(self: Zipper<A>): Option.Option<Zipper<A>> => move(self, (n) => n + 1)

/** @internal */
export const toNonEmptyReadonlyArray = <A>(self: Zipper<A>): ReadonlyArray.NonEmptyReadonlyArray<A> =>
  pipe(
    ReadonlyArray.of(self.focus),
    ReadonlyArray.prependAllNonEmpty(self.lefts),
    ReadonlyArray.appendAllNonEmpty(self.rights)
  )

/** @internal */
export const update = dual<
  <A>(focus: A) => (self: Zipper<A>) => Zipper<A>,
  <A>(self: Zipper<A>, focus: A) => Zipper<A>
>(2, (self, focus) => make(self.lefts, focus, self.rights))
