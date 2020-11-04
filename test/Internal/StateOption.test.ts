import * as assert from 'assert'
import * as O from 'fp-ts/Option'
import * as S from 'fp-ts/State'
import { pipe } from 'fp-ts/function'

import * as _ from '../../src/Internal/StateOption'

const state: unknown = {}

describe('StateOption', () => {
  describe('constructors', () => {
    it('none', () => {
      assert.deepStrictEqual(pipe(_.none(), _.evaluate(state)), O.none)
    })

    it('some', () => {
      assert.deepStrictEqual(pipe(_.some(1), _.evaluate(state)), O.some(1))
    })

    it('get', () => {
      assert.deepStrictEqual(pipe(_.get<number>(), _.evaluate(1)), O.some(1))
    })

    it('put', () => {
      assert.deepStrictEqual(pipe(_.put(1), _.execute(2)), O.some(1))
    })

    it('modify', () => {
      const double = (n: number) => n * 2
      assert.deepStrictEqual(pipe(_.modify(double), _.execute(1)), O.some(2))
    })

    it('gets', () => {
      assert.deepStrictEqual(
        pipe(
          _.gets((s: string) => s.length),
          _.evaluate('a')
        ),
        O.some(1)
      )
    })

    it('fromOption', () => {
      assert.deepStrictEqual(pipe(_.fromOption(O.none), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.fromOption(O.some(1)), _.evaluate(state)), O.some(1))
    })

    it('fromState', () => {
      assert.deepStrictEqual(pipe(_.fromState(S.of(1)), _.evaluate(state)), O.some(1))
    })
  })

  describe('combinators', () => {
    it('fromOptionK', () => {
      const f = (n: number) => O.some(n * 2)
      const g = () => O.none
      assert.deepStrictEqual(pipe(1, _.fromOptionK(f), _.evaluate(state)), O.some(2))
      assert.deepStrictEqual(pipe(1, _.fromOptionK(g), _.evaluate(state)), O.none)
    })

    it('chainOptionK', () => {
      const f = (n: number) => O.some(n * 2)
      const g = () => O.none
      assert.deepStrictEqual(pipe(_.some(1), _.chainOptionK(f), _.evaluate(state)), O.some(2))
      assert.deepStrictEqual(pipe(_.none(), _.chainOptionK(f), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.chainOptionK(g), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.none(), _.chainOptionK(g), _.evaluate(state)), O.none)
    })
  })

  describe('pipeables', () => {
    it('map', () => {
      const double = (n: number) => n * 2
      assert.deepStrictEqual(pipe(_.Functor.map(_.none(), double), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.map(double), _.evaluate(state)), O.some(2))
    })

    it('ap', () => {
      const double = (n: number) => n * 2
      assert.deepStrictEqual(pipe(_.Apply.ap(_.none(), _.none()), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.none(), _.ap(_.some(1)), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.some(double), _.ap(_.none()), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.some(double), _.ap(_.some(1)), _.evaluate(state)), O.some(2))
    })

    it('apFirst', () => {
      assert.deepStrictEqual(pipe(_.some(1), _.apFirst(_.some(2)), _.evaluate(state)), O.some(1))
    })

    it('apSecond', () => {
      assert.deepStrictEqual(pipe(_.some(1), _.apSecond(_.some(2)), _.evaluate(state)), O.some(2))
    })

    it('chain', () => {
      const f = (n: number) => _.some(n * 2)
      const g = () => _.none()
      assert.deepStrictEqual(pipe(_.Monad.chain(_.some(1), f), _.evaluate(state)), O.some(2))
      assert.deepStrictEqual(pipe(_.none(), _.chain(f), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.chain(g), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.none(), _.chain(g), _.evaluate(state)), O.none)
    })

    it('chainFirst', () => {
      const f = (n: number) => _.some(n * 2)
      assert.deepStrictEqual(pipe(_.some(1), _.chainFirst(f), _.evaluate(state)), O.some(1))
    })

    it('flatten', () => {
      assert.deepStrictEqual(pipe(_.some(_.some(1)), _.flatten, _.evaluate(state)), O.some(1))
    })

    it('alt', () => {
      assert.deepStrictEqual(
        pipe(
          _.Alternative.alt(_.some(1), () => _.some(2)),
          _.evaluate(state)
        ),
        O.some(1)
      )
      assert.deepStrictEqual(
        pipe(
          _.some(2),
          _.alt<any, number>(() => _.none()),
          _.evaluate(state)
        ),
        O.some(2)
      )
      assert.deepStrictEqual(
        pipe(
          _.none(),
          _.alt(() => _.some(1)),
          _.evaluate(state)
        ),
        O.some(1)
      )
      assert.deepStrictEqual(
        pipe(
          _.none(),
          _.alt(() => _.none()),
          _.evaluate(state)
        ),
        O.none
      )
    })

    it('zero', () => {
      assert.deepStrictEqual(pipe(_.zero(), _.evaluate(state)), O.none)
    })
  })

  describe('utils', () => {
    it('evaluate', () => {
      assert.deepStrictEqual(pipe(_.none(), _.evaluate(state)), O.none)
      assert.deepStrictEqual(pipe(_.some(1), _.evaluate(state)), O.some(1))
    })

    it('execute', () => {
      assert.deepStrictEqual(
        pipe(_.none() as _.StateOption<string, number>, _.execute('a')),
        O.none
      )
      assert.deepStrictEqual(
        pipe(_.some(1) as _.StateOption<string, number>, _.execute('a')),
        O.some('a')
      )
    })
  })

  describe('do notation', () => {
    it('bind and bindTo', () => {
      assert.deepStrictEqual(
        pipe(
          _.some(1),
          _.bindTo('a'),
          _.bind('b', () => _.some('b')),
          _.evaluate(state)
        ),
        O.some({ a: 1, b: 'b' })
      )
    })
  })
})
