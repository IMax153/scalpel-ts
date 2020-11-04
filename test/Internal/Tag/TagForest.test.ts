import * as assert from 'assert'
import * as A from 'fp-ts/Array'
import * as Tree from 'fp-ts/Tree'
import { pipe } from 'fp-ts/function'

import type { TagForest } from '../../../src/Internal/Tag/TagForest'
import * as T from '../../../src/Internal/Html/Tokenizer'
import * as I from '../../../src/Internal/Tag/TagInfo'
import * as F from '../../../src/Internal/Tag/TagForest'

describe('TagForest', () => {
  describe('constructors', () => {
    it('should return an empty forest when the source is empty', () => {
      assert.deepStrictEqual(pipe(T.parse(''), I.annotateTags, F.fromTagInfo), A.empty)
    })

    it('should return an empty forest when the source is emptdy', () => {
      const preBad: TagForest = []
      const remaining = [
        Tree.make(F.TagSpan(0, 5), [
          Tree.make(F.TagSpan(1, 4), [Tree.make(F.TagSpan(2, 2))]),
          Tree.make(F.TagSpan(3, 4))
        ])
      ]

      assert.deepStrictEqual(F.malformed(2)(preBad, remaining), {
        ok: A.empty,
        bad: [
          Tree.make(F.TagSpan(0, 5), [
            Tree.make(F.TagSpan(1, 4), [Tree.make(F.TagSpan(2, 2))]),
            Tree.make(F.TagSpan(3, 4))
          ])
        ]
      })
    })
  })
})
