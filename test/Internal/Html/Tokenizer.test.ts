import * as assert from 'assert'
import * as M from 'fp-ts/Monoid'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'

import * as T from '../../../src/Internal/Html/Tokenizer'

describe('Tokenizer', () => {
  describe('constructors', () => {
    it('TagOpen', () => {
      assert.deepStrictEqual(T.TagOpen('a', RA.empty), {
        _tag: 'TagOpen',
        name: 'a',
        attributes: RA.empty
      })
    })

    it('TagClose', () => {
      assert.deepStrictEqual(T.TagClose('a'), { _tag: 'TagClose', name: 'a' })
    })

    it('Text', () => {
      assert.deepStrictEqual(T.Text('a'), { _tag: 'Text', text: 'a' })
    })

    it('Comment', () => {
      assert.deepStrictEqual(T.Comment('a'), { _tag: 'Comment', comment: 'a' })
    })
  })

  describe('destructors', () => {
    it('fold', () => {
      const fold = T.fold({
        TagOpen: () => 'TagOpen',
        TagClose: () => 'TagClose',
        Text: () => 'Text',
        Comment: () => 'Comment'
      })

      assert.strictEqual(fold(T.TagOpen('a', RA.empty)), 'TagOpen')
      assert.strictEqual(fold(T.TagClose('a')), 'TagClose')
      assert.strictEqual(fold(T.Text('a')), 'Text')
      assert.strictEqual(fold(T.Comment('a')), 'Comment')
      assert.throws(() => {
        // @ts-expect-error valid Token required
        fold({})
      })
    })
  })

  describe('combinators', () => {
    it('canonicalizeTokens', () => {
      const tokens = [
        T.TagOpen('a', RA.empty),
        T.Text('\n'),
        T.Text(' '),
        T.Text('foo'),
        T.Comment('Comment')
      ]

      assert.deepStrictEqual(T.canonicalizeTokens(tokens), [
        T.TagOpen('a', RA.empty),
        T.Text('foo'),
        T.Comment('Comment')
      ])
    })
  })

  describe('parsers', () => {
    it('should parse valid HTML into a stream of tokens', () => {
      assert.deepStrictEqual(T.parse('<body><!-- Comment --><a>foo</a></body>'), [
        T.TagOpen('body', RA.empty),
        T.Comment(' Comment '),
        T.TagOpen('a', RA.empty),
        T.Text('foo'),
        T.TagClose('a'),
        T.TagClose('body')
      ])
    })
  })

  describe('instances', () => {
    it('showToken', () => {
      const tokens = [
        T.TagOpen('a', RA.of(T.Attribute('key', 'value'))),
        T.Comment(' Comment '),
        T.Text('foo'),
        T.TagClose('a')
      ]
      assert.deepStrictEqual(
        pipe(tokens, RA.foldMap(M.monoidString)(T.showToken.show)),
        `<a key="value"><!-- Comment -->foo</a>`
      )
    })
  })
})
