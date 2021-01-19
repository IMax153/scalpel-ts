import * as E from 'fp-ts/Either'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe, tuple } from 'fp-ts/function'

import type { SpecZipper } from '../src/SerialScraper'
import * as Scrape from '../src/Scraper'
import * as Select from '../src/Select'
import * as Serial from '../src/SerialScraper'
import { scrapeTest } from './test-utils'

describe('SerialScraper', () => {
  describe('destructors', () => {
    describe('inSerial', () => {
      it('should visit immediate children when in a chroot', () => {
        scrapeTest(
          '<parent><a>1</a><b>2</b></parent>',
          E.right(['1', '2']),
          pipe(
            Scrape.text(Select.any),
            Serial.stepNext,
            Serial.repeat,
            Serial.inSerial,
            Scrape.chroot(Select.tag('parent'))
          )
        )
      })

      it('should fail on empty source', () => {
        scrapeTest(
          '',
          E.left('Failed to scrape source'),
          pipe(Scrape.text(Select.any), Serial.seekNext, Serial.repeat, Serial.inSerial)
        )
      })
    })
  })

  describe('combinators', () => {
    describe('repeat', () => {
      it('should repeatedly match a serial scraper', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.right(['1', '2', '3']),
          pipe(Scrape.text(Select.any), Serial.stepNext, Serial.repeat, Serial.inSerial)
        )
      })

      it('should return an empty array when there is no match', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.right(RA.empty),
          pipe(Scrape.text(Select.tag('p')), Serial.stepNext, Serial.repeat, Serial.inSerial)
        )
      })
    })

    describe('repeat1', () => {
      it('should repeatedly match a serial scraper', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.right(['1', '2', '3'] as any),
          pipe(Scrape.text(Select.any), Serial.stepNext, Serial.repeat1, Serial.inSerial)
        )
      })

      it('should fail when there are is no match', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.left('Failed to scrape source'),
          pipe(Scrape.text(Select.tag('p')), Serial.stepNext, Serial.repeat1, Serial.inSerial)
        )
      })
    })
    describe('stepBack', () => {
      it('should move the serial context back by one node', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.right(['1', '2', '3', '2', '1']),
          pipe(
            RA.sequence(Serial.Applicative)([
              pipe(Scrape.text(Select.any), Serial.stepNext),
              pipe(Scrape.text(Select.any), Serial.stepNext),
              pipe(Scrape.text(Select.any), Serial.stepNext),
              pipe(Scrape.text(Select.any), Serial.stepBack),
              pipe(Scrape.text(Select.any), Serial.stepBack)
            ]),
            Serial.inSerial
          )
        )
      })
    })

    describe('stepNext', () => {
      it('should allow stepping off the end of the zipper without reading', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.right(['1', '2', '3', '2', '1']),
          pipe(
            RA.sequence(Serial.Applicative)([
              pipe(Scrape.text(Select.any), Serial.stepNext),
              pipe(Scrape.text(Select.any), Serial.stepNext),
              pipe(Scrape.text(Select.any), Serial.stepNext),
              pipe(Scrape.text(Select.any), Serial.stepBack),
              pipe(Scrape.text(Select.any), Serial.stepBack)
            ]),
            Serial.inSerial
          )
        )
      })

      it('should fail when stepping off the end of the zipper and reading', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.left('Failed to scrape source'),
          pipe(
            RA.sequence(Serial.Applicative)(
              RA.replicate(4, pipe(Scrape.text(Select.any), Serial.stepNext))
            ),
            Serial.inSerial
          )
        )
      })

      it('should allow for selecting siblings', () => {
        scrapeTest(
          "<p class='something'>Here</p><p>Other stuff that matters</p>",
          E.right('Other stuff that matters'),
          pipe(
            Scrape.matches(Select.withAttributes('p', [Select.hasClass('something')])),
            Serial.seekNext,
            Serial.chain(() => pipe(Scrape.text(Select.tag('p')), Serial.stepNext)),
            Serial.inSerial
          )
        )
      })
    })

    describe('seekBack', () => {
      it('should allow seeking off the end of the zipper without reading', () => {
        scrapeTest(
          '<a>1</a><b>2</b><c>3</c>',
          E.right(['3', '1']),
          pipe(
            RA.sequence(Serial.Applicative)([
              Serial.seekNext(Scrape.text(Select.tag('c'))),
              Serial.seekBack(Scrape.text(Select.tag('a')))
            ]),
            Serial.inSerial
          )
        )
      })
    })

    describe('seekNext', () => {
      it('should skip over nodes when seeking', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.right(['2', '3']),
          pipe(
            RA.sequence(Serial.Applicative)([
              Serial.seekNext(Scrape.text(Select.tag('b'))),
              Serial.seekNext(Scrape.text(Select.tag('a')))
            ]),
            Serial.inSerial
          )
        )
      })

      it('should fail if there is no matching node', () => {
        scrapeTest(
          '<a>1</a><b>2</b><a>3</a>',
          E.left('Failed to scrape source'),
          pipe(Select.tag('c'), Scrape.text, Serial.seekNext, Serial.inSerial)
        )
      })

      it('should allow for selection and traversal of immediate children when combined with chroot', () => {
        scrapeTest(
          ` <body>
              <h1>title1</h1>
              <h2>title2 1</h2>
              <p>text 1</p>
              <p>text 2</p>
              <h2>title2 2</h2>
              <p>text 3</p>
              <h2>title2 3</h2>
            </body>`,
          E.right([
            { title: 'title2 1', paragraphs: ['text 1', 'text 2'] },
            { title: 'title2 2', paragraphs: ['text 3'] },
            { title: 'title2 3', paragraphs: [] }
          ]),
          pipe(
            Scrape.text(Select.tag('h2')),
            Serial.seekNext,
            Serial.bindTo('title'),
            Serial.bind('paragraphs', () =>
              pipe(Scrape.text(Select.tag('p')), Serial.stepNext, Serial.repeat)
            ),
            Serial.repeat,
            Serial.inSerial,
            Scrape.chroot(Select.tag('body'))
          )
        )
      })
    })

    describe('untilBack', () => {
      it('should leave the focus of the new context at the end', () => {
        scrapeTest(
          '<b foo=bar /><a>1</a><a>2</a><a>3</a>',
          E.right(tuple('bar', ['1', '2', '3'], ['2', '1'])),
          pipe(
            Scrape.text(Select.tag('a')),
            Serial.seekNext,
            Serial.repeat,
            Serial.bindTo('forwards'),
            Serial.bind('backwards', () =>
              pipe(
                Scrape.text(Select.tag('a')),
                Serial.stepBack,
                Serial.repeat,
                Serial.untilBack(Scrape.matches(Select.tag('b')))
              )
            ),
            Serial.bind('head', () => pipe(Scrape.attr('foo', Select.tag('b')), Serial.stepBack)),
            Serial.map(({ forwards, backwards, head }) => tuple(head, forwards, backwards)),
            Serial.inSerial
          )
        )
      })
    })

    describe('untilNext', () => {
      it('should stop on the first match', () => {
        scrapeTest(
          '1<a>2</a><b>3</b>',
          E.right(['1', '2']),
          pipe(
            Scrape.text(Select.any),
            Serial.stepNext,
            Serial.repeat,
            Serial.untilNext(Scrape.matches(Select.tag('b'))),
            Serial.inSerial
          )
        )
      })

      it('should exhaust the zipper when there are no matches', () => {
        scrapeTest(
          '1<a>2</a><b>3</b>',
          E.right(['1', '2', '3']),
          pipe(
            Scrape.text(Select.any),
            Serial.stepNext,
            Serial.repeat,
            Serial.untilNext(Scrape.matches(Select.tag('c'))),
            Serial.inSerial
          )
        )
      })

      it('should leave the zipper focus at the match', () => {
        scrapeTest(
          '1<a>2</a><b>3</b>',
          E.right('3'),
          pipe(
            Scrape.text(Select.any),
            Serial.stepNext,
            Serial.repeat,
            Serial.untilNext(Scrape.matches(Select.tag('b'))),
            Serial.chain(() => pipe(Scrape.text(Select.tag('b')), Serial.stepNext)),
            Serial.inSerial
          )
        )
      })

      it('should create a valid empty context', () => {
        scrapeTest(
          '<a>1</a><a>2</a>',
          E.right('1'),
          pipe(
            Serial.of<SpecZipper, void>(undefined),
            Serial.untilNext(Scrape.matches(Select.tag('a'))),
            Serial.apSecond(pipe(Scrape.text(Select.tag('a')), Serial.stepNext)),
            Serial.inSerial
          )
        )
      })

      it('should fail to scrape an empty context', () => {
        scrapeTest(
          '<a>1</a><a>2</a>',
          E.left('Failed to scrape source'),
          pipe(
            Scrape.text(Select.any),
            Serial.stepNext,
            Serial.untilNext(Scrape.matches(Select.tag('a'))),
            Serial.apSecond(pipe(Scrape.text(Select.tag('a')), Serial.stepNext)),
            Serial.inSerial
          )
        )
      })
    })
  })

  describe('Alternative', () => {
    it('should handle alternative serial contexts', () => {
      scrapeTest(
        '1<a foo=bar>2</a>3',
        E.right(['1', 'bar', '3']),
        pipe(
          Select.text,
          Select.atDepth(0),
          Scrape.text,
          Serial.stepNext,
          Serial.alt(() =>
            pipe(Scrape.attr('foo', pipe(Select.tag('a'), Select.atDepth(0))), Serial.stepNext)
          ),
          Serial.repeat,
          Serial.inSerial
        )
      )
    })
  })
})
