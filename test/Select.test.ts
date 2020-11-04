import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'

import * as T from '../src/Internal/Html/Tokenizer'
import * as TS from '../src/Internal/Tag/TagSpec'
import * as MR from '../src/Internal/MatchResult'
import * as Scrape from '../src/Scraper'
import * as Select from '../src/Select'
import * as Serial from '../src/SerialScraper'
import { scrapeTest } from './test-utils'

describe('Select', () => {
  describe('constructors', () => {
    it('Selection', () => {
      assert.deepStrictEqual(Select.Selection(Select.SelectText, Select.defaultSelectSettings), {
        strategy: { _tag: 'SelectText' },
        settings: { depth: O.none }
      })
    })

    it('SelectOne', () => {
      assert.deepStrictEqual(Select.SelectOne('a', RA.empty), {
        _tag: 'SelectOne',
        tag: 'a',
        predicates: RA.empty
      })
    })

    it('SelectAny', () => {
      assert.deepStrictEqual(Select.SelectAny(RA.empty), {
        _tag: 'SelectAny',
        predicates: RA.empty
      })
    })

    it('SelectText', () => {
      assert.deepStrictEqual(Select.SelectText, { _tag: 'SelectText' })
    })

    it('SelectSettings', () => {
      assert.deepStrictEqual(Select.SelectSettings(O.some(5)), {
        depth: O.some(5)
      })

      assert.deepStrictEqual(Select.defaultSelectSettings, { depth: O.none })
    })

    it('SelectContext', () => {
      assert.deepStrictEqual(Select.SelectContext(0, false), { position: 0, inChroot: false })
    })
  })

  describe('destructors', () => {
    it('foldStrategy', () => {
      const fold = Select.foldStrategy({
        SelectOne: () => 'SelectOne',
        SelectAny: () => 'SelectAny',
        SelectText: () => 'SelectText'
      })

      assert.deepStrictEqual(fold(Select.SelectOne('a', RA.empty)), 'SelectOne')
      assert.deepStrictEqual(fold(Select.SelectAny(RA.empty)), 'SelectAny')
      assert.deepStrictEqual(fold(Select.SelectText), 'SelectText')
      assert.throws(() => {
        // @ts-expect-error valid SelectStrategy required
        fold({})
      })
    })
  })

  describe('combinators', () => {
    describe('tag', () => {
      it('should select the specified tag', () => {
        scrapeTest('<a>1</a>', E.right('1'), Scrape.text(Select.tag('a')))
      })

      it('should allow lowercase selectors to match any case tag', () => {
        scrapeTest('<a>foo</a><A>bar</A>', E.right(['foo', 'bar']), Scrape.texts(Select.tag('a')))
      })

      it('should allow uppercase selectors to match any case tag', () => {
        scrapeTest('<a>foo</a><A>bar</A>', E.right(['foo', 'bar']), Scrape.texts(Select.tag('A')))
      })
    })

    describe('any', () => {
      it('should select any node', () => {
        scrapeTest('<a>1</a>', E.right('1'), Scrape.text(Select.any))
      })

      it('should match the root node', () => {
        scrapeTest('<a>1<b>2<c>3</c>4</b>5</a>', E.right('12345'), Scrape.text(Select.any))
      })

      it('should select text nodes', () => {
        scrapeTest(
          '1<a>2</a>3<b>4<c>5</c>6</b>7',
          E.right(['1', '2', '3', '456', '7']),
          Scrape.texts(pipe(Select.any, Select.atDepth(0)))
        )
      })
    })

    describe('text', () => {
      it('should select a text node', () => {
        scrapeTest('<a>1</a>', E.right('1'), Scrape.text(Select.text))
      })

      it('should select each text node', () => {
        scrapeTest(
          '1<a>2</a>3<b>4<c>5</c>6</b>7',
          E.right(['1', '2', '3', '4', '5', '6', '7']),
          Scrape.texts(Select.text)
        )
      })
    })

    describe('withAttributes', () => {
      it('should obey attribute predicates', () => {
        scrapeTest(
          '<a>foo</a><a key="value">bar</a>',
          E.right(['<a key="value">bar</a>']),
          Scrape.htmls(Select.withAttributes('a', [Select.attribute('key', 'value')]))
        )
      })
    })

    describe('anyWithAttributes', () => {
      it('should match any tag with the corresponding attributes', () => {
        scrapeTest(
          '<a foo="value">foo</a><b bar="value">bar</b>',
          E.right(['<a foo="value">foo</a>', '<b bar="value">bar</b>']),
          Scrape.htmls(Select.anyWithAttributes([Select.anyAttribute('value')]))
        )
      })

      it('should not match any tag that is missing the corresponding attributes', () => {
        scrapeTest(
          '<a foo="other">foo</a><b bar="value">bar</b>',
          E.right(['<b bar="value">bar</b>']),
          Scrape.htmls(Select.anyWithAttributes([Select.anyAttribute('value')]))
        )
      })
    })

    describe('attribute', () => {
      it('should perform case-insensitive matching on attribute keys', () => {
        scrapeTest(
          '<a B=C>foo</a>',
          E.right(['foo']),
          Scrape.texts(Select.withAttributes('A', [Select.attribute('b', 'C')]))
        )
      })

      it('should perform case-sensitive matching on attribute values', () => {
        scrapeTest(
          '<a B=C>foo</a>',
          E.right([]),
          Scrape.texts(Select.withAttributes('A', [Select.attribute('b', 'c')]))
        )
      })

      it('should invert attribute value matching when combined with `notP`', () => {
        scrapeTest(
          '<a>foo</a><a B=C>bar</a><a B=D>baz</a>',
          E.right(['foo', 'baz']),
          Scrape.texts(Select.withAttributes('a', [Select.notP(Select.attribute('b', 'C'))]))
        )
      })
    })

    describe('anyAttribute', () => {
      it('should match any attribute key', () => {
        scrapeTest(
          '<a foo="value">foo</a><a bar="value">bar</a>',
          E.right(['<a foo="value">foo</a>', '<a bar="value">bar</a>']),
          Scrape.htmls(Select.withAttributes('a', [Select.anyAttribute('value')]))
        )
      })

      it('should not match any attribute value', () => {
        scrapeTest(
          '<a foo="other">foo</a><a bar="value">bar</a>',
          E.right(['<a bar="value">bar</a>']),
          Scrape.htmls(Select.withAttributes('a', [Select.anyAttribute('value')]))
        )
      })
    })

    describe('attributeRegex', () => {
      it('should match an attribute value using a regular expression', () => {
        scrapeTest(
          '<a key="value">foo</a>',
          E.right(['<a key="value">foo</a>']),
          Scrape.htmls(
            Select.withAttributes('a', [Select.attributeRegex('key', /va(foo|bar|lu)e/)])
          )
        )
      })
    })

    describe('anyAttributeRegex', () => {
      it('should match any attribute key', () => {
        scrapeTest(
          '<a foo="value">foo</a><a bar="value">bar</a>',
          E.right(['<a foo="value">foo</a>', '<a bar="value">bar</a>']),
          Scrape.htmls(Select.withAttributes('a', [Select.anyAttributeRegex(/va(foo|bar|lu)e/)]))
        )
      })

      it('should not match any attribute value', () => {
        scrapeTest(
          '<a foo="other">foo</a><a bar="value">bar</a>',
          E.right(['<a bar="value">bar</a>']),
          Scrape.htmls(Select.withAttributes('a', [Select.anyAttributeRegex(/va(foo|bar|lu)e/)]))
        )
      })
    })

    describe('atDepth', () => {
      it('should select children at the specified depth', () => {
        scrapeTest(
          '<a><b>1</b><c><b>2</b></c></a>',
          E.right(['2']),
          Scrape.texts(
            pipe(Select.tag('a'), Select.nested(pipe(Select.tag('b'), Select.atDepth(2))))
          )
        )

        scrapeTest(
          '<a><b>1</b><c><b>2</b></c></a>',
          E.right(['2']),
          Scrape.texts(
            pipe(Select.tag('a'), Select.nested(pipe(Select.tag('b'))), Select.atDepth(2))
          )
        )
      })

      it('should have no effect when there is no selector specified', () => {
        scrapeTest(
          '<a><b>1</b><c><b>2</b></c></a>',
          E.right(['12']),
          Scrape.texts(pipe(Select.tag('a'), Select.nested(pipe(RA.empty, Select.atDepth(2)))))
        )
      })

      it('should compose with attribute predicates', () => {
        scrapeTest(
          "<a><b class='foo'>1</b><c><b class='foo'>2</b></c></a>",
          E.right(['2']),
          Scrape.texts(
            pipe(
              Select.tag('a'),
              Select.nested(
                pipe(Select.withAttributes('b', [Select.hasClass('foo')]), Select.atDepth(2))
              )
            )
          )
        )
      })

      it('should handle tags closed out of order (full context)', () => {
        // Depth should handle malformed HTML correctly. Below <b> and <c> are not
        // closed in the proper order, but since <d> is nested within both in the
        // context of <a>, <d> is still at depth 3.
        scrapeTest(
          '<a><b><c><d>1</d></b></c></a>',
          E.right(['1']),
          Scrape.texts(
            pipe(Select.tag('a'), Select.nested(pipe(Select.tag('d'), Select.atDepth(3))))
          )
        )
      })

      it('should cull matches exceeding the specified depth', () => {
        scrapeTest(
          '<a><b><c>1</c><a><b><c></c></b></a></b></a>',
          E.right([]),
          pipe(
            Select.tag('a'),
            Select.nested(pipe(Select.tag('b'), Select.atDepth(2))),
            Select.nested(Select.tag('c')),
            Scrape.html,
            Serial.seekNext,
            Serial.repeat,
            Serial.inSerial
          )
        )
      })

      // TODO: determine a better method for handling malformed self-closing tags
      it('should handle tags closed out of order (partial context)', () => {
        // However, from the context of <b>, <d> is only at depth 1 because there is
        // no closing <c> tag within the <b> tag so the <c> tag is assumed to be
        // self-closing.
        //   scrapeTest(
        //     '<a><b><c><d>2</d></b></c></a>',
        //     E.right(['2']),
        //     Scrape.texts(
        //       pipe(Select.tag('b'), Select.nested(pipe(Select.tag('d'), Select.atDepth(1))))
        //     )
        //   )
      })

      // TODO: determine a better method for handling malformed self-closing tags
      it('should treat out of focus closing tags as immediately closed', () => {
        // scrapeTest(
        //   '<a><b><c><d>2</d></c></a></b>',
        //   E.right(['2']),
        //   Scrape.texts(
        //     pipe(Select.tag('a'), Select.nested(pipe(Select.tag('d'), Select.atDepth(2))))
        //   )
        // )
      })
    })

    describe('nested', () => {
      it('should match the deepest node', () => {
        scrapeTest(
          '<a><b><c>foo</c></b></a>',
          E.right(['<c>foo</c>']),
          Scrape.htmls(
            pipe(Select.tag('a'), Select.nested(Select.tag('b')), Select.nested(Select.tag('c')))
          )
        )
      })

      it('should skip irrelevant nodes', () => {
        scrapeTest(
          '<c><a><b>foo</b></a></c><c><a><d><b>bar</b></d></a></c><b>baz</b>',
          E.right(['<b>foo</b>', '<b>bar</b>']),
          Scrape.htmls(pipe(Select.tag('a'), Select.nested(Select.tag('b'))))
        )
      })

      it('nested should force a descent before matching', () => {
        scrapeTest(
          '<div id="outer"><div id="inner">inner text</div></div>',
          E.right(['inner']),
          Scrape.attrs('id', pipe(Select.tag('div'), Select.nested(Select.tag('div'))))
        )
      })

      it('should match div/div/div twice when selecting a div nested beneath a div', () => {
        scrapeTest(
          '<div id="a"><div id="b"><div id="c"></div></div></div>',
          E.right(['b', 'c']),
          Scrape.attrs('id', pipe(Select.tag('div'), Select.nested(Select.tag('div'))))
        )
      })

      it('should handle tags closed out of order', () => {
        scrapeTest(
          '<a><b><c><d>2</d></b></c></a>',
          E.right(['2']),
          Scrape.texts(pipe(Select.tag('b'), Select.nested(Select.tag('d'))))
        )
      })

      it('should handle tags closed out of order for the root (1)', () => {
        scrapeTest(
          '<b><c><d>2</d></b></c>',
          E.right(['2']),
          Scrape.texts(pipe(Select.tag('b'), Select.nested(Select.tag('d'))))
        )
      })

      it('should handle tags closed out of order for the root (2)', () => {
        scrapeTest(
          '<b><c><d>2</d></b></c>',
          E.right(['2']),
          Scrape.texts(pipe(Select.tag('c'), Select.nested(Select.tag('d'))))
        )
      })
    })

    describe('hasClass', () => {
      it('should match tags with multiple classes', () => {
        scrapeTest(
          '<a class="a b">foo</a>',
          E.right(['<a class="a b">foo</a>']),
          Scrape.htmls(Select.withAttributes('a', [Select.hasClass('a')]))
        )
      })

      it('should not match tags that do not contain the specified class', () => {
        scrapeTest(
          '<a class="a b">foo</a>',
          E.right([]),
          Scrape.htmls(Select.withAttributes('a', [Select.hasClass('c')]))
        )
      })
    })

    describe('notP', () => {
      it('should negate an attribute predicate', () => {
        scrapeTest(
          '<a>foo</a><a class="a b">bar</a><a class="b">baz</a>',
          E.right(['foo', 'baz']),
          Scrape.texts(Select.withAttributes('a', [Select.notP(Select.hasClass('a'))]))
        )
      })
    })

    describe('match', () => {
      it('should allow for custom attribute predicates', () => {
        scrapeTest(
          '<a foo="bar">1</a><a foo="foo">2</a><a bar="bar">3</a>',
          E.right(['<a foo="foo">2</a>', '<a bar="bar">3</a>']),
          Scrape.htmls(Select.anyWithAttributes([Select.match(Eq.eqString.equals)]))
        )
      })
    })
  })

  describe('selectors', () => {
    describe('checkSettings', () => {
      it('should return MatchOk on empty current hierarchy', () => {
        const tags = T.parse('')
        const curr = TS.tagsToSpec(tags)
        const root = TS.tagsToSpec(tags)

        assert.strictEqual(
          Select.checkSettings(Select.SelectSettings(O.some(1)), curr, root),
          MR.MatchOk
        )
      })
    })
  })

  describe('DFS Traversal', () => {
    it('should traverse selectors in a depth first manner (1)', () => {
      scrapeTest(
        '<div><p>p1</p><p>p2</p><blockquote><p>p3</p></blockquote><p>p4</p>',
        E.right(['p1', 'p2', 'p3', 'p4']),
        Scrape.texts(Select.tag('p'))
      )
    })

    it('should traverse selectors in a depth first manner (2)', () => {
      scrapeTest(
        '<a><b>1</b></a><a><b>2</b></a><a><b>3</b></a>',
        E.right(['1', '2', '3']),
        Scrape.texts(Select.tag('a'))
      )
    })

    it('should traverse selectors in a depth first manner (3)', () => {
      scrapeTest(
        '<a><b>1</b></a><a><b>2</b></a><a><b>3</b></a>',
        E.right(['1', '2', '3']),
        Scrape.texts(pipe(Select.tag('a'), Select.nested(Select.tag('b'))))
      )
    })

    it('should traverse selectors in a depth first manner (4)', () => {
      scrapeTest(
        '<a><b>1</b></a><a><b>2</b></a><a><b>3</b></a>',
        E.right(['1', '2', '3']),
        Scrape.texts(Select.tag('b'))
      )
    })
  })
})
