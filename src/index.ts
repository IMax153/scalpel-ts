import * as util from 'util'
import { log } from 'fp-ts/Console'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { run } from 'parser-ts/code-frame'

import * as Parser from './Html/Parser'
import * as Select from './Select'
import * as Serial from './Serial'
import * as Scraper from './Scraper'

// type Author = string

// type Comment = TextComment | ImageComment

// interface TextComment {
//   readonly _tag: 'TextComment'
//   readonly author: Author
//   readonly text: string
// }

// interface ImageComment {
//   readonly _tag: 'ImageComment'
//   readonly author: Author
//   readonly url: string
// }

// const TextComment = (author: Author, text: string): Comment => ({
//   _tag: 'TextComment',
//   author,
//   text
// })

// const ImageComment = (author: Author, url: string): Comment => ({
//   _tag: 'ImageComment',
//   author,
//   url
// })

// const textComment: S.Scraper<Comment> = pipe(
//   S.text(Select.withAttributes('span', [Select.hasClass('author')])),
//   S.bindTo('author'),
//   S.bind('text', () => S.text(Select.withAttributes('div', [Select.hasClass('text')]))),
//   S.bind('_tag', () => S.of('TextComment' as const))
// )

// const imageComment: S.Scraper<Comment> = pipe(
//   S.text(Select.withAttributes('span', [Select.hasClass('author')])),
//   S.bindTo('author'),
//   S.bind('url', () => S.attr('src', Select.withAttributes('img', [Select.hasClass('image')]))),
//   S.bind('_tag', () => S.of('ImageComment' as const))
// )

// const comment: S.Scraper<Comment> = pipe(
//   textComment,
//   S.alt(() => imageComment)
// )

// const comments: S.Scraper<ReadonlyArray<Comment>> = pipe(
//   comment,
//   S.chroots(Select.withAttributes('div', [Select.hasClass('container')]))
// )

// log(
//   util.inspect(
//     pipe(
//       run(
//         Parser.parse,
//         `
// <!DOCTYPE html>
// <html>
//   <!-- I am a comment! -->
//   <body>
//     <div class='comments'>
//       <div class='comment container'>
//         <span class='comment author'>Sally</span>
//         <div class='comment text'>Woo hoo!</div>
//       </div>
//       <div class='comment container'>
//         <span class='comment author'>Bill</span>
//         <img class='comment image' src='http://example.com/cat.gif' />
//       </div>
//       <div class='comment container'>
//         <span class='comment author'>Susan</span>
//         <div class='comment text'>WTF!?!</div>
//       </div>
//     </div>
//   </body>
// </html>
//   `
//       ),
//       E.map(S.scrape(comments))
//     ),
//     {
//       depth: null
//     }
//   )
// )()

// log(
//   util.inspect(
//     pipe(
//       run(
//         Parser.parse,
//         `
//         <article>
//           <p>First paragraph.</p>
//           <p>Second paragraph.</p>
//           <p>Third paragraph.</p>
//         </article>
//       `
//       ),
//       E.map(
//         pipe(
//           Scraper.scrape(
//             pipe(
//               Scraper.position,
//               Scraper.bindTo('index'),
//               Scraper.bind('content', () => Scraper.texts(Select.tag('p'))),
//               Scraper.chroots(pipe(Select.tag('article'), Select.nested(Select.tag('p'))))
//             )
//           )
//         )
//       )
//     ),
//     { depth: null }
//   )
// )()

log(
  util.inspect(
    pipe(
      run(
        Parser.parse,
        `
        <article>
          <h1>title</h1>
          <h2>Section 1</h2>
          <p>Paragraph 1.1</p>
          <p>Paragraph 1.2</p>
          <h2>Section 2</h2>
          <p>Paragraph 2.1</p>
          <p>Paragraph 2.2</p>
        </article>
      `
      ),
      E.map(
        Scraper.scrape(
          pipe(
            Serial.seekNext(Scraper.text(Select.tag('h1'))),
            Serial.bindTo('title'),
            Serial.bind('sections', () =>
              pipe(
                Serial.seekNext(Scraper.text(Select.tag('h2'))),
                Serial.bindTo('section'),
                Serial.bind('ps', () =>
                  pipe(
                    Serial.seekNext(Scraper.text(Select.tag('p'))),
                    Serial.repeat,
                    Serial.untilNext(Scraper.matches(Select.tag('h2')))
                  )
                ),
                Serial.repeat
              )
            ),
            Serial.inSerial,
            Scraper.chroot(Select.tag('article'))
          )
        )
      )
    ),
    { depth: null }
  )
)()
