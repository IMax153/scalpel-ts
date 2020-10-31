import * as C from 'fp-ts/Console'
import * as IO from 'fp-ts/IO'
import * as IOE from 'fp-ts/IOEither'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import { absurd, flow, pipe, Endomorphism } from 'fp-ts/lib/function'

import * as S from '../src/Scraper'
import * as Select from '../src/Select'
import * as Serial from '../src/SerialScraper'
import { parse } from '../src/Internal/Html/Tokenizer'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Scraper = S.Scraper
import Selector = Select.Selector

type Markdown = string

/**
 *
 */
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
 * Prepends an element to every element in an array
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
  pipe(formattedTexts, S.chroot(pipe(selector, Select.atDepth(0))))

const formattedTexts: Scraper<ReadonlyArray<FormattedText>> = (spec) => {
  const italic: Scraper<FormattedText> = pipe(recurseOn(Select.tag('em')), S.map(Italic))

  const bold: Scraper<FormattedText> = pipe(recurseOn(Select.tag('b')), S.map(Bold))

  const header: Scraper<FormattedText> = pipe(recurseOn(Select.tag('header')), S.map(Paragraph))

  const paragraph: Scraper<FormattedText> = pipe(recurseOn(Select.tag('p')), S.map(Paragraph))

  const plainText: Scraper<FormattedText> = pipe(
    S.text(pipe(Select.text, Select.atDepth(0))),
    S.map(PlainText)
  )

  const newline: Scraper<FormattedText> = pipe(
    S.matches(pipe(Select.tag('br'), Select.atDepth(0))),
    S.map(() => Newline)
  )

  const formatting: Scraper<FormattedText> = pipe(
    newline,
    S.alt(() => paragraph),
    S.alt(() => bold),
    S.alt(() => italic),
    S.alt(() => header),
    S.alt(() => plainText)
  )

  const h1: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h1')), S.map(Header(1)))
  const h2: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h2')), S.map(Header(2)))
  const h3: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h3')), S.map(Header(3)))
  const h4: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h4')), S.map(Header(4)))
  const h5: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h5')), S.map(Header(5)))
  const h6: Scraper<FormattedText> = pipe(recurseOn(Select.tag('h6')), S.map(Header(6)))
  const headers: Scraper<FormattedText> = pipe(
    h1,
    S.alt(() => h2),
    S.alt(() => h3),
    S.alt(() => h4),
    S.alt(() => h5),
    S.alt(() => h6)
  )

  const unknown: Scraper<FormattedText> = pipe(recurseOn(Select.any), S.map(PlainTexts))

  const nav: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('nav')),
    S.map(() => PlainTexts(RA.empty))
  )

  const noscript: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('noscript')),
    S.map(() => PlainTexts(RA.empty))
  )

  const script: Scraper<FormattedText> = pipe(
    recurseOn(Select.tag('script')),
    S.map(() => PlainTexts(RA.empty))
  )

  const skip: Scraper<FormattedText> = pipe(
    nav,
    S.alt(() => noscript),
    S.alt(() => script)
  )

  const link: Scraper<FormattedText> = pipe(
    S.attr('href', Select.any),
    S.bindTo('href'),
    S.bind('texts', () => formattedTexts),
    S.map(({ href, texts }) => Link(href, texts)),
    S.chroot(pipe(Select.tag('a'), Select.atDepth(0)))
  )

  const innerScraper: Scraper<FormattedText> = pipe(
    formatting,
    S.alt(() => link),
    S.alt(() => headers),
    S.alt(() => skip),
    S.alt(() => unknown)
  )

  const scraper: Scraper<ReadonlyArray<FormattedText>> = pipe(
    Serial.stepNext(innerScraper),
    Serial.repeat,
    Serial.inSerial
  )

  return scraper(spec)
}

const formattedText: Scraper<FormattedText> = pipe(formattedTexts, S.map(PlainTexts))

const content: Scraper<FormattedText> = pipe(
  formattedText,
  // Prefer to extract just the article content.
  S.chroot(Select.tag('article')),
  S.alt(() =>
    pipe(
      formattedText,
      // Fallback to everything in the body otherwise
      S.chroot(Select.tag('body'))
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
  parse(exampleHTML),
  IOE.fromEither,
  IOE.mapLeft(() => 'Unable to parse the HTML'),
  IOE.chain((tokens) =>
    pipe(
      tokens,
      S.scrape(content),
      O.map(printMd),
      IOE.fromOption(() => 'Unable to scrape the HTML')
    )
  ),
  IOE.fold(C.error, C.log)
)

main()
