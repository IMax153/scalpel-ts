import * as Scraper from "@effect/scraper/Scraper"
import * as Select from "@effect/scraper/Select"
import { scrapeTest } from "@effect/scraper/test/utils/scrapeTest"
import { describe } from "vitest"

describe("Select", () => {
  scrapeTest(
    "tag - should select the the specified tag",
    "<a>1</a>",
    "1",
    Scraper.text(Select.tag("a"))
  )

  scrapeTest(
    "tag - should allow lowercase selectors to match any case tag",
    "<a>foo</a><A>bar</A>",
    ["foo", "bar"],
    Scraper.texts(Select.tag("a"))
  )

  scrapeTest(
    "tag - should allow uppercase selectors to match any case tag",
    "<a>foo</a><A>bar</A>",
    ["foo", "bar"],
    Scraper.texts(Select.tag("A"))
  )

  scrapeTest(
    "any - should select any node",
    "<a>1</a>",
    "1",
    Scraper.text(Select.any)
  )

  scrapeTest(
    "any - should match the root node",
    "<a>1<b>2<c>3</c>4</b>5</a>",
    "12345",
    Scraper.text(Select.any)
  )

  scrapeTest(
    "any - should select text nodes",
    "1<a>2</a>3<b>4<c>5</c>6</b>7",
    ["1", "2", "3", "456", "7"],
    Scraper.texts(Select.atDepth(Select.any, 0))
  )

  scrapeTest(
    "text - should select a text node",
    "<a>1</a>",
    "1",
    Scraper.text(Select.text)
  )

  scrapeTest(
    "text - should select each text node",
    "1<a>2</a>3<b>4<c>5</c>6</b>7",
    ["1", "2", "3", "4", "5", "6", "7"],
    Scraper.texts(Select.text)
  )

  scrapeTest(
    "withAttributes - should obey attribute predicates",
    "<a>foo</a><a key=\"value\">bar</a>",
    ["<a key=\"value\">bar</a>"],
    Scraper.htmls(Select.withAttributes("a", [Select.attribute("key", "value")]))
  )

  scrapeTest(
    "anyWithAttributes - should match any tag with the corresponding attributes",
    "<a foo=\"value\">foo</a><b bar=\"value\">bar</b>",
    ["<a foo=\"value\">foo</a>", "<b bar=\"value\">bar</b>"],
    Scraper.htmls(Select.anyWithAttributes([Select.anyAttribute("value")]))
  )

  scrapeTest(
    "anyWithAttributes - should not match any tag that is missing the corresponding attributes",
    "<a foo=\"other\">foo</a><b bar=\"value\">bar</b>",
    ["<b bar=\"value\">bar</b>"],
    Scraper.htmls(Select.anyWithAttributes([Select.anyAttribute("value")]))
  )
})
