import * as C from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import * as M from 'fp-ts/Monoid'
import * as RA from 'fp-ts/ReadonlyArray'
import { absurd, flow, pipe, Endomorphism } from 'fp-ts/lib/function'

import type { Scraper } from '../src/Scraper'
import type { Selector } from '../src/Select'
import * as F from '../src/Fetch'
import * as Scrape from '../src/Scraper'
import * as Select from '../src/Select'
import * as Serial from '../src/SerialScraper'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

type Markdown = string

type FormattedText = PlainText | PlainTexts | Header | Paragraph | Bold | Italic | Link | Newline

interface PlainText {
  readonly _tag: 'PlainText'
  readonly text: string
}

interface PlainTexts {
  readonly _tag: 'PlainTexts'
  readonly texts: ReadonlyArray<FormattedText>
}

interface Header {
  readonly _tag: 'Header'
  readonly level: number
  readonly texts: ReadonlyArray<FormattedText>
}

interface Paragraph {
  readonly _tag: 'Paragraph'
  readonly texts: ReadonlyArray<FormattedText>
}

interface Bold {
  readonly _tag: 'Bold'
  readonly texts: ReadonlyArray<FormattedText>
}

interface Italic {
  readonly _tag: 'Italic'
  readonly texts: ReadonlyArray<FormattedText>
}

interface Link {
  readonly _tag: 'Link'
  readonly url: string
  readonly texts: ReadonlyArray<FormattedText>
}

interface Newline {
  readonly _tag: 'Newline'
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const PlainText = (text: string): FormattedText => ({
  _tag: 'PlainText',
  text
})

const PlainTexts = (texts: ReadonlyArray<FormattedText>): FormattedText => ({
  _tag: 'PlainTexts',
  texts
})

const Header = (level: number) => (texts: ReadonlyArray<FormattedText>): FormattedText => ({
  _tag: 'Header',
  level,
  texts
})

const Paragraph = (texts: ReadonlyArray<FormattedText>): FormattedText => ({
  _tag: 'Paragraph',
  texts
})

const Bold = (texts: ReadonlyArray<FormattedText>): FormattedText => ({
  _tag: 'Bold',
  texts
})

const Italic = (texts: ReadonlyArray<FormattedText>): FormattedText => ({
  _tag: 'Italic',
  texts
})

const Link = (url: string, texts: ReadonlyArray<FormattedText>): FormattedText => ({
  _tag: 'Link',
  url,
  texts
})

const Newline: FormattedText = {
  _tag: 'Newline'
}

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

const fold = <R>(patterns: {
  readonly PlainText: (text: string) => R
  readonly PlainTexts: (texts: ReadonlyArray<FormattedText>) => R
  readonly Header: (level: number, texts: ReadonlyArray<FormattedText>) => R
  readonly Paragraph: (texts: ReadonlyArray<FormattedText>) => R
  readonly Bold: (texts: ReadonlyArray<FormattedText>) => R
  readonly Italic: (texts: ReadonlyArray<FormattedText>) => R
  readonly Link: (url: string, texts: ReadonlyArray<FormattedText>) => R
  readonly Newline: () => R
}): ((formattedText: FormattedText) => R) => {
  const f = (x: FormattedText): R => {
    switch (x._tag) {
      case 'PlainText':
        return patterns.PlainText(x.text)
      case 'PlainTexts':
        return patterns.PlainTexts(x.texts)
      case 'Header':
        return patterns.Header(x.level, x.texts)
      case 'Paragraph':
        return patterns.Paragraph(x.texts)
      case 'Bold':
        return patterns.Bold(x.texts)
      case 'Italic':
        return patterns.Italic(x.texts)
      case 'Link':
        return patterns.Link(x.url, x.texts)
      case 'Newline':
        return patterns.Newline()
      default:
        return absurd<R>(x as never)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Prepends an element to every element in an array.
 */
const prependToAll = <A>(e: A) => (xs: ReadonlyArray<A>): ReadonlyArray<A> => {
  if (xs.length === 0) return xs
  const ys: Array<A> = []
  /* eslint-disable-next-line no-restricted-syntax */
  for (const x of xs) {
    ys.push(e, x)
  }
  return ys
}

/**
 * Places an element in between members of an array.
 */
const intersperse: <A>(e: A) => (as: ReadonlyArray<A>) => ReadonlyArray<A> = (e) => (as) => {
  if (RA.isEmpty(as)) return as
  return RA.cons(as[0], prependToAll(e)(as.slice(1, as.length)))
}

/**
 * Removes the specified `replace` string with the specified `replacement` string
 * in a target string.
 */
const replace: (replace: string, replacement: string) => Endomorphism<string> = (a, b) => (s) =>
  s.replace(a, b)

/**
 * Removes leading and trailing whitespace from a string.
 */
const strip: Endomorphism<string> = (s) => s.trim()

/**
 * Removes indents from a string.
 */
const removeIndents: Endomorphism<string> = (raw) => {
  const clean = raw.replace('\n ', '\n')
  return raw === clean ? raw : removeIndents(clean)
}

/**
 * Collapses duplicate newlines.
 */
const collapseNewLines: Endomorphism<string> = (raw) => {
  const clean = raw.replace('\n\n\n\n', '\n\n')
  return raw === clean ? raw : collapseNewLines(clean)
}

/**
 * Concatenates a list of strings.
 */
const foldS: (as: ReadonlyArray<string>) => string = M.fold(M.monoidString)

/**
 * Escapes characters that are known to cause issues in markdown.
 */
const escapeMd: (text: string) => Markdown = flow(
  replace('\n', ''),
  replace('\\', '\\\\'),
  replace('*', '\\*'),
  replace('_', '\\_'),
  replace('>', '&gt;')
)

/**
 * Convert a FormattedText to Markdown.
 */
const textToMarkdown: (formattedText: FormattedText) => Markdown = fold({
  PlainText: (text) => pipe(text, strip, escapeMd),
  PlainTexts: (texts) => pipe(texts, textsToMarkdown),
  Header: (level, texts) =>
    foldS(['\n', foldS(RA.replicate(level, '#')), ' ', textsToMarkdown(texts), '\n\n']),
  Paragraph: (texts) => foldS([textsToMarkdown(texts), '\n\n']),
  Bold: (texts) => foldS(['**', textsToMarkdown(texts), '**']),
  Italic: (texts) => foldS(['*', textsToMarkdown(texts), '*']),
  Link: (url, texts) => foldS(['[', textsToMarkdown(texts), '](', url, ')']),
  Newline: () => '\n\n'
})

/**
 * Convert an array of FormattedText to Markdown.
 */
const textsToMarkdown: (texts: ReadonlyArray<FormattedText>) => Markdown = flow(
  RA.map(textToMarkdown),
  intersperse(' '),
  foldS
)

/**
 * Cleanup whitespace left over after converting FormattedText to Markdown.
 */
const cleanupMd: Endomorphism<string> = flow(strip, collapseNewLines, removeIndents)

/**
 * Prints a Markdown string.
 */
const printMd: (text: FormattedText) => string = flow(textToMarkdown, cleanupMd)

// -------------------------------------------------------------------------------------
// scrapers
// -------------------------------------------------------------------------------------

const recurseOn = (selector: Selector): Scraper<ReadonlyArray<FormattedText>> =>
  pipe(formattedTexts, Scrape.chroot(pipe(selector, Select.atDepth(0))))

const formattedTexts: Scraper<ReadonlyArray<FormattedText>> = (spec) => {
  const italic: Scraper<FormattedText> = pipe(recurseOn(Select.tag('em')), Scrape.map(Italic))

  const bold: Scraper<FormattedText> = pipe(recurseOn(Select.tag('b')), Scrape.map(Bold))

  const header: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('header')),
    Scrape.map(Paragraph)
  )

  const paragraph: Scraper<FormattedText> = pipe(recurseOn(Select.tag('p')), Scrape.map(Paragraph))

  const plainText: Scraper<FormattedText> = pipe(
    Scrape.text(pipe(Select.text, Select.atDepth(0))),
    Scrape.map(PlainText)
  )

  const newline: Scraper<FormattedText> = pipe(
    Scrape.matches(pipe(Select.tag('br'), Select.atDepth(0))),
    Scrape.map(() => Newline)
  )

  const formatting: Scraper<FormattedText> = pipe(
    newline,
    Scrape.alt(() => paragraph),
    Scrape.alt(() => bold),
    Scrape.alt(() => italic),
    Scrape.alt(() => header),
    Scrape.alt(() => plainText)
  )

  const h1: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h1')), Scrape.map(Header(1)))
  const h2: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h2')), Scrape.map(Header(2)))
  const h3: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h3')), Scrape.map(Header(3)))
  const h4: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h4')), Scrape.map(Header(4)))
  const h5: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h5')), Scrape.map(Header(5)))
  const h6: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h6')), Scrape.map(Header(6)))
  const headers: Scraper<FormattedText> = pipe(
    h1,
    Scrape.alt(() => h2),
    Scrape.alt(() => h3),
    Scrape.alt(() => h4),
    Scrape.alt(() => h5),
    Scrape.alt(() => h6)
  )

  const unknown: Scraper<FormattedText> = pipe(recurseOn(Select.any), Scrape.map(PlainTexts))

  const nav: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('nav')),
    Scrape.map(() => PlainTexts(RA.empty))
  )

  const noscript: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('noscript')),
    Scrape.map(() => PlainTexts(RA.empty))
  )

  const script: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('script')),
    Scrape.map(() => PlainTexts(RA.empty))
  )

  const skip: Scraper<FormattedText> = pipe(
    nav,
    Scrape.alt(() => noscript),
    Scrape.alt(() => script)
  )

  const link: Scraper<FormattedText> = pipe(
    Scrape.attr('href', Select.any),
    Scrape.bindTo('href'),
    Scrape.bind('texts', () => formattedTexts),
    Scrape.map(({ href, texts }) => Link(href, texts)),
    Scrape.chroot(pipe(Select.tag('a'), Select.atDepth(0)))
  )

  const innerScraper: Scraper<FormattedText> = pipe(
    formatting,
    Scrape.alt(() => link),
    Scrape.alt(() => headers),
    Scrape.alt(() => skip),
    Scrape.alt(() => unknown)
  )

  const scraper: Scraper<ReadonlyArray<FormattedText>> = pipe(
    Serial.stepNext(innerScraper),
    Serial.repeat,
    Serial.inSerial
  )

  return scraper(spec)
}

const formattedText: Scraper<FormattedText> = pipe(formattedTexts, Scrape.map(PlainTexts))

const content: Scraper<FormattedText> = pipe(
  formattedText,
  // Prefer to extract just the article content.
  Scrape.chroot(Select.tag('article')),
  Scrape.alt(() =>
    pipe(
      formattedText,
      // Fallback to everything in the body otherwise
      Scrape.chroot(Select.tag('body'))
    )
  )
)

const exampleHTML = `
<body>
  <p>paragraph</p>
  <h1>h1</h1>
  <h2>h2</h2>
  <h3>h3</h3>
  <h4>h4</h4>
  <h5>h5</h5>
  <h6>h6</h6>
  <a href="https://www.github.com">link</a>
  <p>
    <b>bold</b>
    <i>italic</i>
    <b><i>bold italic</i></b>
  </p>
</body>
`

const main: IO.IO<void> = pipe(
  content,
  F.scrapeRaw(exampleHTML),
  IOE.fromEither,
  IOE.map(printMd),
  IOE.fold(C.error, C.log)
)

main()
