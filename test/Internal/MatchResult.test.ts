import * as assert from 'assert'
import * as fc from 'fast-check'
import * as laws from 'fp-ts-laws'
import * as Eq from 'fp-ts/Eq'

import * as MR from '../../src/Internal/MatchResult'

const arb = fc.constantFrom(MR.MatchOk, MR.MatchFail, MR.MatchCull)

describe('MatchResult', () => {
  describe('constructors', () => {
    it('MatchOk', () => {
      assert.strictEqual(MR.MatchOk, 'MatchOk')
    })

    it('MatchFail', () => {
      assert.strictEqual(MR.MatchFail, 'MatchFail')
    })

    it('MatchCull', () => {
      assert.strictEqual(MR.MatchCull, 'MatchCull')
    })

    it('fromBoolean', () => {
      assert.strictEqual(MR.fromBoolean(true), MR.MatchOk)
      assert.strictEqual(MR.fromBoolean(false), MR.MatchFail)
    })
  })

  describe('destructors', () => {
    it('fold', () => {
      const fold = MR.fold({
        MatchOk: () => MR.MatchOk,
        MatchFail: () => MR.MatchFail,
        MatchCull: () => MR.MatchCull
      })

      fc.assert(
        fc.property(arb, (mr) => {
          Eq.eqString.equals(fold(mr), mr)
        })
      )

      assert.throws(() => {
        // @ts-expect-error valid MatchResult required
        fold('')
      })
    })
  })

  describe('instances', () => {
    it('semigroupMatchResult', () => {
      laws.semigroup(MR.semigroupMatchResult, Eq.eqString, arb)
    })
  })
})
