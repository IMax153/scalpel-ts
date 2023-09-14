import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Scraper from "@effect/scraper/Scraper"
import * as Select from "@effect/scraper/Select"
import { scrapeTest } from "@effect/scraper/test/utils/scrapeTest"
import { describe } from "vitest"

describe("Scraper", () => {
  scrapeTest(
    "attr - should extract the value of the first matching attribute",
    "<a key=\"foo\" />",
    "foo",
    Scraper.attr("key", Select.tag("a"))
  )

  scrapeTest(
    "attr - should extract the value of the first matching attribute with complex predicates",
    "<a key1=foo/><b key1=bar key2=foo /><a key1=bar key2=baz />",
    "baz",
    Scraper.attr("key2", Select.withAttributes("a", [Select.attribute("key1", "bar")]))
  )

  scrapeTest(
    "attr - should treat unclosed tags as immediately closed",
    "<img src='foobar'>",
    "foobar",
    Scraper.attr("src", Select.tag("img"))
  )

  scrapeTest(
    "attr - should handle self-closing tags",
    "<img src='foobar' />",
    "foobar",
    Scraper.attr("src", Select.tag("img"))
  )

  scrapeTest(
    "attrs - should extract the value of all matching attributes",
    "<a key1=foo /><b key1=bar key2=foo /><a key1=bar key2=baz />",
    ["foo", "bar"],
    Scraper.attrs("key1", Select.tag("a"))
  )

  scrapeTest(
    "attrs - should ignore closing tags, text, and comments",
    "<a><!-- Comment -->foo</a><a key1=foo></a><a key1=bar>bar</a>",
    ["foo", "bar"],
    Scraper.attrs("key1", Select.tag("a"))
  )

  scrapeTest(
    "chroots - limits the context of a scraper to all matching nodes",
    "<a><b>foo</b></a><a><b>bar</b></a>",
    ["foo", "bar"],
    Scraper.text(Select.tag("b")).pipe(Scraper.chroots(Select.tag("a")))
  )

  scrapeTest(
    "chroot - limits the context to the first the selected node",
    "<a><b>foo</b></a><a><b>bar</b></a>",
    ["foo"],
    Scraper.texts(Select.tag("b")).pipe(Scraper.chroot(Select.tag("a")))
  )

  scrapeTest(
    "html - should extract a matching tag",
    "<a>foo</a>",
    "<a>foo</a>",
    Scraper.html(Select.tag("a"))
  )

  scrapeTest(
    "html - should match the root node",
    "<a>foo</a>",
    "<a>foo</a>",
    Scraper.html(Select.tag("a"))
  )

  scrapeTest(
    "html - should match a nested node",
    "<body><div><ul><li>1</li><li>2</li></ul></div></body>",
    "<li>1</li>",
    Scraper.html(Select.tag("li"))
  )

  scrapeTest(
    "html - should match a node without inner text",
    "<body><div></div></body>",
    "<div></div>",
    Scraper.html(Select.tag("div"))
  )

  scrapeTest(
    "htmls - should extract matching tags",
    "<a>foo</a><a>bar</a>",
    ["<a>foo</a>", "<a>bar</a>"],
    Scraper.htmls(Select.tag("a"))
  )

  scrapeTest(
    "htmls - should extract html from nested nodes",
    "<body><div><ul><li>1</li><li>2</li></ul></div></body>",
    ["<li>1</li>", "<li>2</li>"],
    Scraper.htmls(Select.tag("li"))
  )

  scrapeTest(
    "htmls - should extract html matching nested nodes without inner text",
    "<body><div></div></body>",
    ["<div></div>"],
    Scraper.htmls(Select.tag("div"))
  )

  scrapeTest(
    "htmls - should extract a matching tag even when nested",
    "<b><a>foo</a><b>",
    ["<a>foo</a>"],
    Scraper.htmls(Select.tag("a"))
  )

  scrapeTest(
    "htmls - should result in an empty list when there are no matching nodes",
    "<a>foo</a>",
    [],
    Scraper.htmls(Select.tag("b"))
  )

  scrapeTest(
    "htmls - should treat unclosed tags as immediately closed",
    "<a>foo",
    ["<a>foo</a>"],
    Scraper.htmls(Select.tag("a"))
  )

  scrapeTest(
    "innerHTML - should exclude root tags",
    "<a>1<b>2</b>3</a>",
    "1<b>2</b>3",
    Scraper.innerHTML(Select.any)
  )

  scrapeTest(
    "innerHTML - should return an empty string for a self-closed tag",
    "<a>",
    "",
    Scraper.innerHTML(Select.any)
  )

  scrapeTest(
    "should match root nodes",
    "<a>foo</a><a>bar</a>",
    ["foo", "bar"],
    Scraper.innerHTMLs(Select.tag("a"))
  )

  scrapeTest(
    "position - should return the index of the matched node",
    "<article><p>A</p><p>B</p><p>C</p></article>",
    [
      { index: 0, content: "A" },
      { index: 1, content: "B" },
      { index: 2, content: "C" }
    ],
    Effect.gen(function*($) {
      const index = yield* $(Scraper.position)
      const content = yield* $(Scraper.text(Select.tag("p")))
      return Option.all({ index, content })
    }).pipe(Scraper.chroots(pipe(Select.tag("article"), Select.nested(Select.tag("p")))))
  )

  scrapeTest(
    "should return the index of the most recently matched node",
    "<article><p>A</p></article><article><p>B</p><p>C</p></article>",
    [
      [{ index: 0, content: "A" }],
      [
        { index: 0, content: "B" },
        { index: 1, content: "C" }
      ]
    ],
    Effect.gen(function*($) {
      const index = yield* $(Scraper.position)
      const content = yield* $(Scraper.text(Select.any))
      return Option.all({ index, content })
    }).pipe(
      Scraper.chroots(Select.tag("p")),
      Scraper.chroots(Select.tag("article"))
    )
  )

  scrapeTest(
    "satisfies - should result in void on matching nodes",
    "<a>1</a>",
    undefined,
    Scraper.satisfies(Select.tag("a"))
  )

  scrapeTest(
    "text - should extract the inner text from the first matching tag",
    "<a>foo</a>",
    "foo",
    Scraper.text(Select.tag("a"))
  )

  scrapeTest(
    "text - should extract the inner text from only the first matching tag",
    "<a>foo</a><a>bar</a>",
    "foo",
    Scraper.text(Select.tag("a"))
  )

  scrapeTest(
    "texts - should extract the inner text from all matching tags",
    "<a>foo</a><a>bar</a>",
    ["foo", "bar"],
    Scraper.texts(Select.tag("a"))
  )

  scrapeTest(
    "texts - should return an empty array when no selector is specified",
    "<a>foo</a><a>bar</a>",
    [],
    Scraper.texts([])
  )

  scrapeTest(
    "texts - should not extract comments",
    "<a><!-- Comment -->foo</a><a>bar</a>",
    ["foo", "bar"],
    Scraper.texts(Select.tag("a"))
  )
})
