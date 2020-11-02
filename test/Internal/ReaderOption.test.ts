import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import { pipe, Predicate } from 'fp-ts/function'

import * as _ from '../../src/Internal/ReaderOption'

describe('ReaderOption', () => {
  describe('constructors', () => {
    it('none', () => {
      assert.deepStrictEqual(_.none({}), O.none)
    })

    it('some', () => {
      assert.deepStrictEqual(_.of('a')({}), O.some('a'))
    })

    it('ask', () => {
      assert.deepStrictEqual(_.ask()({}), O.some({}))
    })

    it('asks', () => {
      assert.deepStrictEqual(_.asks((r: { readonly a: number }) => r.a)({ a: 1 }), O.some(1))
    })

    it('fromOption', () => {
      assert.deepStrictEqual(pipe(O.none, _.fromOption)({}), O.none)
      assert.deepStrictEqual(pipe(O.some(1), _.fromOption)({}), O.some(1))
    })

    it('fromReader', () => {
      assert.deepStrictEqual(pipe(R.of(1), _.fromReader)({}), O.some(1))
    })

    it('fromPredicate', () => {
      const predicate: Predicate<number> = (n) => n > 0
      assert.deepStrictEqual(pipe(0, _.fromPredicate(predicate))({}), O.none)
      assert.deepStrictEqual(pipe(1, _.fromPredicate(predicate))({}), O.some(1))
    })
  })

  describe('destructors', () => {
    it('fold', () => {
      const fold = _.fold(
        () => () => 0,
        (s: string) => () => s.length
      )
      assert.deepStrictEqual(fold(_.none)({}), 0)
      assert.deepStrictEqual(fold(_.some('a'))({}), 1)
    })

    it('getOrElseW', () => {
      const onNone = () => R.of(0)
      assert.deepStrictEqual(pipe(_.none, _.getOrElseW(onNone))({}), 0)
      assert.deepStrictEqual(pipe(_.some(1), _.getOrElseW(onNone))({}), 1)
    })
  })

  describe('combinators', () => {
    it('fromOptionK', () => {
      const f = (a: string): O.Option<number> => O.some(a.length)
      const g = (): O.Option<number> => O.none
      assert.deepStrictEqual(pipe('a', _.fromOptionK(f))({}), O.some(1))
      assert.deepStrictEqual(pipe('a', _.fromOptionK(g))({}), O.none)
    })

    it('chainOptionK', () => {
      const f = (a: string): O.Option<number> => O.some(a.length)
      const g = (): O.Option<number> => O.none
      assert.deepStrictEqual(pipe(_.none, _.chainOptionK(f))({}), O.none)
      assert.deepStrictEqual(pipe(_.some('a'), _.chainOptionK(f))({}), O.some(1))
      assert.deepStrictEqual(pipe(_.none, _.chainOptionK(g))({}), O.none)
      assert.deepStrictEqual(pipe(_.some('a'), _.chainOptionK(g))({}), O.none)
    })
  })

  describe('pipeable', () => {
    it('map', () => {
      const double = (n: number) => n * 2
      assert.deepStrictEqual(_.Functor.map(_.none, double)({}), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.map(double))({}), O.some(2))
    })

    it('ap', () => {
      const double = (n: number) => n * 2
      assert.deepStrictEqual(_.Apply.ap(_.none, _.none)({}), O.none)
      assert.deepStrictEqual(pipe(_.none, _.ap(_.some(1)))({}), O.none)
      assert.deepStrictEqual(pipe(_.some(double), _.ap(_.none))({}), O.none)
      assert.deepStrictEqual(pipe(_.some(double), _.ap(_.some(1)))({}), O.some(2))
    })

    it('apFirst', () => {
      assert.deepStrictEqual(pipe(_.some(1), _.apFirst(_.some(2)))({}), O.some(1))
    })

    it('apSecond', () => {
      assert.deepStrictEqual(pipe(_.some(1), _.apSecond(_.some(2)))({}), O.some(2))
    })

    it('chain', () => {
      const f = (n: number) => _.some(n * 2)
      const g = () => _.none
      assert.deepStrictEqual(_.Monad.chain(_.some(1), f)({}), O.some(2))
      assert.deepStrictEqual(pipe(_.none, _.chain(f))({}), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.chain(g))({}), O.none)
      assert.deepStrictEqual(pipe(_.none, _.chain(g))({}), O.none)
    })

    it('chainFirst', () => {
      const f = (n: number) => _.some(n * 2)
      assert.deepStrictEqual(pipe(_.some(1), _.chainFirst(f))({}), O.some(1))
    })

    it('flatten', () => {
      assert.deepStrictEqual(pipe(_.some(_.some(1)), _.flatten)({}), O.some(1))
    })

    it('alt', () => {
      assert.deepStrictEqual(_.Alternative.alt(_.some(1), () => _.some(2))({}), O.some(1))
      assert.deepStrictEqual(
        pipe(
          _.some(2),
          _.alt<any, number>(() => _.none)
        )({}),
        O.some(2)
      )
      assert.deepStrictEqual(
        pipe(
          _.none,
          _.alt(() => _.some(1))
        )({}),
        O.some(1)
      )
      assert.deepStrictEqual(
        pipe(
          _.none,
          _.alt(() => _.none)
        )({}),
        O.none
      )
    })

    it('zero', () => {
      assert.deepStrictEqual(_.zero()({}), O.none)
    })

    it('compact', () => {
      assert.deepStrictEqual(_.Filterable.compact(_.none)({}), O.none)
      assert.deepStrictEqual(_.compact(_.some(O.none))({}), O.none)
      assert.deepStrictEqual(_.compact(_.some(O.some('a')))({}), O.some('a'))
    })

    it('separate', () => {
      assert.deepStrictEqual(_.Filterable.separate(_.none).left({}), O.none)
      assert.deepStrictEqual(_.separate(_.none).right({}), O.none)
      assert.deepStrictEqual(_.separate(_.some(E.left('a'))).left({}), O.some('a'))
      assert.deepStrictEqual(_.separate(_.some(E.left('a'))).right({}), O.none)
      assert.deepStrictEqual(_.separate(_.some(E.right('a'))).left({}), O.none)
      assert.deepStrictEqual(_.separate(_.some(E.right('a'))).right({}), O.some('a'))
    })

    it('filter', () => {
      const p = (a: number) => a === 2
      assert.deepStrictEqual(_.Filterable.filter(_.none, p)({}), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.filter(p))({}), O.none)
      assert.deepStrictEqual(pipe(_.some(2), _.filter(p))({}), O.some(2))
    })

    it('filterMap', () => {
      const p = (n: number) => n > 2
      const f = (n: number) => (p(n) ? O.some(n + 1) : O.none)
      assert.deepStrictEqual(_.Filterable.filterMap(_.none, f)({}), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.filterMap(f))({}), O.none)
      assert.deepStrictEqual(pipe(_.some(3), _.filterMap(f))({}), O.some(4))
    })

    it('partition', () => {
      const p = (n: number) => n > 2
      assert.deepStrictEqual(_.Filterable.partition(_.none, p).left({}), O.none)
      assert.deepStrictEqual(pipe(_.none, _.partition(p)).right({}), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.partition(p)).left({}), O.some(1))
      assert.deepStrictEqual(pipe(_.some(1), _.partition(p)).right({}), O.none)
      assert.deepStrictEqual(pipe(_.some(3), _.partition(p)).left({}), O.none)
      assert.deepStrictEqual(pipe(_.some(3), _.partition(p)).right({}), O.some(3))
    })

    it('partitionMap', () => {
      const p = (n: number) => n > 2
      const f = (n: number) => (p(n) ? E.right(n + 1) : E.left(n - 1))
      assert.deepStrictEqual(_.Filterable.partitionMap(_.none, f).left({}), O.none)
      assert.deepStrictEqual(pipe(_.none, _.partitionMap(f)).right({}), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.partitionMap(f)).left({}), O.some(0))
      assert.deepStrictEqual(pipe(_.some(1), _.partitionMap(f)).right({}), O.none)
      assert.deepStrictEqual(pipe(_.some(3), _.partitionMap(f)).left({}), O.none)
      assert.deepStrictEqual(pipe(_.some(3), _.partitionMap(f)).right({}), O.some(4))
    })
  })

  describe('do notation', () => {
    it('bind and bindTo', () => {
      assert.deepStrictEqual(
        pipe(
          _.some(1),
          _.bindTo('a'),
          _.bind('b', () => _.some('b'))
        )({}),
        O.some({ a: 1, b: 'b' })
      )
    })
  })
})
