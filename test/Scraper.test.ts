import * as E from 'fp-ts/Either'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'

import * as Scrape from '../src/Scraper'
import * as Select from '../src/Select'
import { scrapeTest } from './test-utils'

describe('Scraper', () => {
  describe('chroots', () => {
    it('limits the context of a scraper to all matching nodes', () => {
      scrapeTest(
        '<a><b>foo</b></a><a><b>bar</b></a>',
        E.right(['foo', 'bar']),
        pipe(Scrape.text(Select.tag('b')), Scrape.chroots(Select.tag('a')))
      )
    })
  })

  describe('chroot', () => {
    it('limits the context to the first the selected node', () => {
      scrapeTest(
        '<a><b>foo</b></a><a><b>bar</b></a>',
        E.right(['foo']),
        pipe(Scrape.texts(Select.tag('b')), Scrape.chroot(Select.tag('a')))
      )
    })
  })

  describe('matches', () => {
    it('should result in void on matching nodes', () => {
      scrapeTest('<a>1</a>', E.right(undefined), Scrape.matches(Select.tag('a')))
    })
  })

  describe('text', () => {
    it('should extract the inner text from the first matching tag', () => {
      scrapeTest('<a>foo</a>', E.right('foo'), Scrape.text(Select.tag('a')))
    })

    it('should extract the inner text from only the first matching tag', () => {
      scrapeTest('<a>foo</a><a>bar</a>', E.right('foo'), Scrape.text(Select.tag('a')))
    })
  })

  describe('texts', () => {
    it('should extract the inner text from all matching tags', () => {
      scrapeTest('<a>foo</a><a>bar</a>', E.right(['foo', 'bar']), Scrape.texts(Select.tag('a')))
    })

    it('should return an empty array when no selector is specified', () => {
      scrapeTest('<a>foo</a><a>bar</a>', E.right([]), Scrape.texts(RA.empty))
    })

    it('should not extract comments', () => {
      scrapeTest(
        '<a><!-- Comment -->foo</a><a>bar</a>',
        E.right(['foo', 'bar']),
        Scrape.texts(Select.tag('a'))
      )
    })
  })

  describe('attr', () => {
    it('should extract the value of the first matching attribute', () => {
      scrapeTest('<a key="foo" />', E.right('foo'), Scrape.attr('key', Select.tag('a')))
    })

    it('should extract the value of the first matching attribute with complex predicates', () => {
      scrapeTest(
        '<a key1=foo/><b key1=bar key2=foo /><a key1=bar key2=baz />',
        E.right('baz'),
        Scrape.attr('key2', Select.withAttributes('a', [Select.attribute('key1', 'bar')]))
      )
    })

    it('should treat unclosed tags as immediately closed', () => {
      scrapeTest("<img src='foobar'>", E.right('foobar'), Scrape.attr('src', Select.tag('img')))
    })

    it('should handle self-closing tags', () => {
      scrapeTest("<img src='foobar' />", E.right('foobar'), Scrape.attr('src', Select.tag('img')))
    })
  })

  describe('attrs', () => {
    it('should extract the value of all matching attributes', () => {
      scrapeTest(
        '<a key1=foo /><b key1=bar key2=foo /><a key1=bar key2=baz />',
        E.right(['foo', 'bar']),
        Scrape.attrs('key1', Select.tag('a'))
      )
    })

    it('should ignore closing tags, text, and comments', () => {
      scrapeTest(
        '<a><!-- Comment -->foo</a><a key1=foo></a><a key1=bar>bar</a>',
        E.right(['foo', 'bar']),
        Scrape.attrs('key1', Select.tag('a'))
      )
    })
  })

  describe('html', () => {
    it('should extract a matching tag', () => {
      scrapeTest('<a>foo</a>', E.right('<a>foo</a>'), Scrape.html(Select.tag('a')))
    })

    it('should match the root node', () => {
      scrapeTest('<a>foo</a>', E.right('<a>foo</a>'), Scrape.html(Select.tag('a')))
    })

    it('should match a nested node', () => {
      scrapeTest(
        '<body><div><ul><li>1</li><li>2</li></ul></div></body>',
        E.right('<li>1</li>'),
        Scrape.html(Select.tag('li'))
      )
    })

    it('should match a node without inner text', () => {
      scrapeTest('<body><div></div></body>', E.right('<div></div>'), Scrape.html(Select.tag('div')))
    })
  })

  describe('htmls', () => {
    it('should extract matching tags', () => {
      scrapeTest(
        '<a>foo</a><a>bar</a>',
        E.right(['<a>foo</a>', '<a>bar</a>']),
        Scrape.htmls(Select.tag('a'))
      )
    })

    it('should extract html from nested nodes', () => {
      scrapeTest(
        '<body><div><ul><li>1</li><li>2</li></ul></div></body>',
        E.right(['<li>1</li>', '<li>2</li>']),
        Scrape.htmls(Select.tag('li'))
      )
    })

    it('should extract html matching nested nodes without inner text', () => {
      scrapeTest(
        '<body><div></div></body>',
        E.right(['<div></div>']),
        Scrape.htmls(Select.tag('div'))
      )
    })

    it('should extract a matching tag even when nested', () => {
      scrapeTest('<b><a>foo</a><b>', E.right(['<a>foo</a>']), Scrape.htmls(Select.tag('a')))
    })

    it('should result in an empty list when there are no matching nodes', () => {
      scrapeTest('<a>foo</a>', E.right([]), Scrape.htmls(Select.tag('b')))
    })

    it('should treat unclosed tags as immediately closed', () => {
      scrapeTest('<a>foo', E.right(['<a>foo</a>']), Scrape.htmls(Select.tag('a')))
    })
  })

  describe('innerHTML', () => {
    it('should exclude root tags', () => {
      scrapeTest('<a>1<b>2</b>3</a>', E.right('1<b>2</b>3'), Scrape.innerHTML(Select.any))
    })

    it('should return an empty string for a self-closed tag', () => {
      scrapeTest('<a>', E.right(''), Scrape.innerHTML(Select.any))
    })
  })

  describe('innerHTMLs', () => {
    it('should match root nodes', () => {
      scrapeTest(
        '<a>foo</a><a>bar</a>',
        E.right(['foo', 'bar']),
        Scrape.innerHTMLs(Select.tag('a'))
      )
    })
  })

  describe('position', () => {
    it('should return the index of the matched node', () => {
      scrapeTest(
        '<article><p>A</p><p>B</p><p>C</p></article>',
        E.right([
          { index: 0, content: 'A' },
          { index: 1, content: 'B' },
          { index: 2, content: 'C' }
        ]),
        pipe(
          Scrape.position,
          Scrape.bindTo('index'),
          Scrape.bind('content', () => Scrape.text(Select.any)),
          Scrape.chroots(pipe(Select.tag('article'), Select.nested(Select.tag('p'))))
        )
      )
    })

    it('should return the index of the most recently matched node', () => {
      scrapeTest(
        '<article><p>A</p></article><article><p>B</p><p>C</p></article>',
        E.right([
          [{ index: 0, content: 'A' }],
          [
            { index: 0, content: 'B' },
            { index: 1, content: 'C' }
          ]
        ]),
        pipe(
          Scrape.position,
          Scrape.bindTo('index'),
          Scrape.bind('content', () => Scrape.text(Select.any)),
          Scrape.chroots(Select.tag('p')),
          Scrape.chroots(Select.tag('article'))
        )
      )
    })

    describe('Functor', () => {
      it('map', () => {
        scrapeTest(
          '<a>foo</a><a>bar</a>',
          E.right([true, false]),
          pipe(Scrape.texts(Select.tag('a')), Scrape.map(RA.map((text) => text === 'foo')))
        )
      })
    })

    describe('Alternative', () => {
      it('should return the first match', () => {
        scrapeTest(
          '<a><b>foo</b></a><a><c>bar</c></a>',
          E.right('foo'),
          pipe(
            Scrape.text(pipe(Select.tag('a'), Select.nested(Select.tag('b')))),
            Scrape.alt(() => Scrape.text(pipe(Select.tag('a'), Select.nested(Select.tag('c')))))
          )
        )
      })

      it('should return the second match', () => {
        scrapeTest(
          '<a><b>foo</b></a><a><c>bar</c></a>',
          E.right('bar'),
          pipe(
            Scrape.text(pipe(Select.tag('a'), Select.nested(Select.tag('d')))),
            Scrape.alt(() => Scrape.text(pipe(Select.tag('a'), Select.nested(Select.tag('c')))))
          )
        )
      })
    })

    describe('Filterable', () => {
      it('should remove results that match the filter predicate', () => {
        scrapeTest(
          '<a>foo</a><a>bar</a><a>baz</a>',
          E.right('<a>bar</a>'),
          pipe(
            Scrape.text(Select.any),
            Scrape.filter((text) => text.includes('b')),
            Scrape.chain(() => Scrape.html(Select.any)),
            Scrape.chroot(Select.tag('a'))
          )
        )
      })
    })
  })
})
