import * as assert from 'assert'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RM from 'fp-ts/ReadonlyMap'
import { pipe } from 'fp-ts/function'

import * as T from '../../../src/Internal/Html/Tokenizer'
import * as I from '../../../src/Internal/Tag/TagInfo'

describe('TagInfo', () => {
  describe('constructors', () => {
    it('TagInfo', () => {
      assert.deepStrictEqual(I.TagInfo(T.Text('a'), O.some(1)), {
        token: T.Text('a'),
        closeOffset: O.some(1)
      })
    })

    it('annotateTags', () => {
      const annotated = pipe(T.parse('<body><div>hello</div></body>'), I.annotateTags)

      assert.deepStrictEqual(annotated, [
        I.TagInfo(T.TagOpen('body', RA.empty), O.some(4)),
        I.TagInfo(T.TagOpen('div', RA.empty), O.some(2)),
        I.TagInfo(T.Text('hello'), O.none),
        I.TagInfo(T.TagClose('div'), O.none),
        I.TagInfo(T.TagClose('body'), O.none)
      ])
    })
  })

  describe('utils', () => {
    describe('alterMap', () => {
      it('should insert a value into the map if not already present', () => {
        const map: ReadonlyMap<string, number> = RM.empty

        assert.deepStrictEqual(
          pipe(
            map,
            I.alterMap(Eq.eqString)(
              'a',
              O.alt(() => O.some(1))
            )
          ),
          new Map([['a', 1]])
        )
      })

      it('should return the unmodified map if the insert function returns None', () => {
        const map: ReadonlyMap<string, number> = RM.empty

        assert.deepStrictEqual(
          pipe(
            map,
            I.alterMap(Eq.eqString)(
              'a',
              O.alt<number>(() => O.none)
            )
          ),
          new Map()
        )
      })

      it('should update an existing value in the map', () => {
        const map: ReadonlyMap<string, number> = new Map([['a', 1]])

        assert.deepStrictEqual(
          pipe(
            map,
            I.alterMap(Eq.eqString)(
              'a',
              O.map((n) => n + 1)
            )
          ),
          new Map([['a', 2]])
        )
      })

      it('should return the unmodified map if the update function returns None', () => {
        const map: ReadonlyMap<string, number> = new Map([['a', 1]])

        assert.deepStrictEqual(
          pipe(
            map,
            I.alterMap(Eq.eqString)(
              'a',
              O.chain(() => O.none)
            )
          ),
          new Map([['a', 1]])
        )
      })
    })
  })
})
