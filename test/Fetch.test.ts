import fetchMock, { enableFetchMocks } from 'jest-fetch-mock'
import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'

import * as Select from '../src/Select'
import * as Scrape from '../src/Scraper'
import * as T from '../src/Internal/Html/Tokenizer'
import * as F from '../src/Fetch'

enableFetchMocks()

describe('Fetch', () => {
  it('fetchTagsRaw', () => {
    assert.deepStrictEqual(F.fetchTagsRaw('<a></a>'), [T.TagOpen('a', RA.empty), T.TagClose('a')])
  })

  it('fetchTags', async () => {
    fetchMock.mockResponseOnce('<a></a>')

    assert.deepStrictEqual(
      await F.fetchTags('')(),
      E.right([T.TagOpen('a', RA.empty), T.TagClose('a')])
    )
  })

  it('fetchTagsWithConfig', async () => {
    fetchMock.mockResponseOnce('<a></a>')

    assert.deepStrictEqual(
      await pipe(F.FetchConfig(fetchMock), F.fetchTagsWithConfig(''))(),
      E.right([T.TagOpen('a', RA.empty), T.TagClose('a')])
    )
  })

  it('scrapeRaw', () => {
    const scraper = pipe(Select.tag('a'), Scrape.html)

    assert.deepStrictEqual(pipe(scraper, F.scrapeRaw('<a>1</a>')), E.right('<a>1</a>'))
    assert.deepStrictEqual(pipe(scraper, F.scrapeRaw('')), E.left('Failed to scrape source'))
  })

  it('scrapeURL', async () => {
    fetchMock.mockResponseOnce('<a>1</a>')

    const scraper = pipe(Select.tag('a'), Scrape.html)

    assert.deepStrictEqual(await pipe(scraper, F.scrapeURL(''))(), E.right('<a>1</a>'))
  })

  it('scrapeURLWithConfig', async () => {
    fetchMock.mockResponseOnce('<a>1</a>')

    const scraper = pipe(Select.tag('a'), Scrape.html)

    assert.deepStrictEqual(
      await pipe(F.FetchConfig(fetchMock), F.scrapeURLWithConfig('')(scraper))(),
      E.right('<a>1</a>')
    )
    assert.deepStrictEqual(
      await pipe(F.FetchConfig(fetchMock), F.scrapeURLWithConfig('')(scraper))(),
      E.left('Failed to scrape source')
    )
  })

  describe('defaultDecoder', () => {
    it('should use UTF-8 encoding if Content-Type is UTF-8', async () => {
      fetchMock.mockResponseOnce('<a></a>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8'
        }
      })

      assert.deepStrictEqual(
        await F.fetchTags('')(),
        E.right([T.TagOpen('a', RA.empty), T.TagClose('a')])
      )
    })

    it('should use ISO-8859-1 encoding on unknown character set', async () => {
      fetchMock.mockResponseOnce('<a></a>', {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1'
        }
      })

      assert.deepStrictEqual(
        await F.fetchTags('')(),
        E.right([T.TagOpen('a', RA.empty), T.TagClose('a')])
      )
    })
  })
})
