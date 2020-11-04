import * as assert from 'assert'
import * as Tree from 'fp-ts/Tree'
import { pipe } from 'fp-ts/function'

import * as Select from '../../../src/Select'
import * as T from '../../../src/Internal/Html/Tokenizer'
import * as F from '../../../src/Internal/Tag/TagForest'
import * as I from '../../../src/Internal/Tag/TagInfo'
import * as S from '../../../src/Internal/Tag/TagSpec'

describe('TagSpec', () => {
  describe('constructors', () => {
    it('TagSpec', () => {
      const context = Select.SelectContext(0, false)
      const tags = pipe(T.parse('<div>hello</div>'), I.annotateTags)
      const hierarchy = F.fromTagInfo(tags)

      assert.deepStrictEqual(S.TagSpec(context, hierarchy, tags), {
        context,
        hierarchy,
        tags
      })
    })

    it('tagsToSpec', () => {
      const tokens = T.parse('<div>hello</div>')

      assert.deepStrictEqual(S.tagsToSpec(tokens), {
        context: Select.SelectContext(0, false),
        hierarchy: [Tree.make(F.TagSpan(0, 2), [Tree.make(F.TagSpan(1, 1))])],
        tags: I.annotateTags(tokens)
      })
    })
  })
})
