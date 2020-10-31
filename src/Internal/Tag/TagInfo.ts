/**
 * @since 0.0.1
 */
import type { Option } from 'fp-ts/Option'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RM from 'fp-ts/ReadonlyMap'
import { constant, flow, pipe, Endomorphism } from 'fp-ts/function'

import type { Token } from '../Html/Tokenizer'
import * as T from '../Html/Tokenizer'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents a token and its pre-computed metadata which can be accessed in tight
 * inner loops while scraping.
 *
 * @category model
 * @since 0.0.1
 */
export interface TagInfo {
  // /**
  //  * The name of the parsed token, if present. Tokens that have associated names
  //  * include:
  //  * - `TagOpen`
  //  * - `TagSelfClose`
  //  * - `TagClose`
  //  * - `Doctype`
  //  */
  // readonly name: Option<string>
  /**
   * The parsed token.
   */
  readonly token: Token
  /**
   * The offset from the parsed token to the token that contains its closing tag,
   * if present. The only tokens that will have an offset are `TagOpen` tokens.
   */
  readonly closeOffset: Option<number>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const TagInfo = (token: Token, closeOffset: Option<number>): TagInfo => ({
  token,
  closeOffset
})

interface IndexedToken {
  readonly index: number
  readonly token: Token
}

interface IndexedTagInfo {
  readonly index: number
  readonly info: TagInfo
}

const IndexedToken = (index: number, token: Token): IndexedToken => ({
  index,
  token
})

const IndexedTagInfo = (index: number, info: TagInfo): IndexedTagInfo => ({
  index,
  info
})

const ordIndexedTagInfo: Ord.Ord<IndexedTagInfo> = pipe(
  Ord.ordNumber,
  Ord.contramap(({ index }) => index)
)

/**
 * Alters a value `V` at the key `K`, or absence thereof. Can be used to insert, delete,
 * or update a value in a `ReadonlyMap`.
 */
const alterMap = <K>(E: Eq.Eq<K>) => <V>(key: K, f: Endomorphism<Option<V>>) => (
  map: ReadonlyMap<K, V>
): ReadonlyMap<K, V> =>
  pipe(
    map,
    RM.lookup(E)(key),
    O.fold(
      () =>
        pipe(
          f(O.none),
          O.chain((a) => O.some(pipe(map, RM.insertAt(E)(key, a)))),
          O.getOrElse(() => map)
        ),
      (a) =>
        pipe(
          f(O.some(a)),
          O.chain((b) => pipe(map, RM.updateAt(E)(key, b))),
          O.getOrElse(() => map)
        )
    )
  )

const appendToken = (x: IndexedToken): Endomorphism<Option<ReadonlyArray<IndexedToken>>> =>
  O.fold(() => pipe(RA.of(x), O.some), flow(RA.cons(x), O.some))

const popToken: Endomorphism<Option<ReadonlyArray<IndexedToken>>> = O.fold(
  constant(O.none),
  RA.tail
)

const calculateOffset = (start: IndexedToken) => (end: IndexedToken): IndexedTagInfo => {
  const info = TagInfo(end.token, O.some(start.index - end.index))
  return IndexedTagInfo(end.index, info)
}

const appendToStack = (
  index: number,
  token: T.TagOpen,
  stack: ReadonlyMap<string, ReadonlyArray<IndexedToken>>
): ReadonlyMap<string, ReadonlyArray<IndexedToken>> =>
  pipe(stack, alterMap(Eq.eqString)(token.name, appendToken(IndexedToken(index, token))))

const removeFromStack = (
  token: T.TagClose,
  stack: ReadonlyMap<string, ReadonlyArray<IndexedToken>>
): ReadonlyMap<string, ReadonlyArray<IndexedToken>> =>
  pipe(stack, alterMap(Eq.eqString)(token.name, popToken))
/**
 * Annotates each parsed token with the name of its associated HTML tag, if present,
 * and the offset to its closing tag, if present.
 *
 * ### Time Complexity
 * This annotation is accomplished with a time complexity of `O(n * log(n))`.
 *
 * ### Algorithm
 * The algorithm takes in a list of tokens and associates each token with its index
 * in the parsed token stream. A map of unclosed opening HTML tags is maintained,
 * keyed by tag name. The annotation steps are as follows:
 *
 * 1. When an opening tag is encountered in the parsed token stream, it is prepended
 * to the token stack associated with its name in the token map.
 *
 * 2. When a closing tag is encountered, the corresponding opening tag is popped of off
 * the token stack associated with its name and the offset between the two is computed.
 * The opening tag is annotated with the offset, and both tokens are added to the result
 * set.
 *
 * 3. When any other tag is encountered, it is immediately added to the result set.
 *
 * 4. After all tags are either in the result set or in the token map, all unclosed tags
 * from the token map are added to the result set without a closing offset.
 *
 * 5. The result set is then sorted by their indices.
 *
 * @category constructors
 * @since 0.0.1
 */
export const annotateTokens = (tokens: ReadonlyArray<Token>): ReadonlyArray<TagInfo> => {
  const M = RA.getMonoid<IndexedTagInfo>()

  let results: ReadonlyArray<IndexedTagInfo> = RA.empty
  let stack: ReadonlyMap<string, ReadonlyArray<IndexedToken>> = RM.empty

  // To improve stack safety, we use an iterative approach
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]

    switch (token._tag) {
      case 'TagOpen': {
        // Add opening tag to the stack
        stack = appendToStack(i, token, stack)
        break
      }

      case 'TagClose': {
        // Calculate the offset between opening and closing tags
        const tags = pipe(
          stack,
          RM.lookup(Eq.eqString)(token.name),
          O.chain(RA.head),
          O.traverse(RA.Applicative)(flow(calculateOffset(IndexedToken(i, token)), RA.of)),
          RA.compact,
          RA.cons(IndexedTagInfo(i, TagInfo(token, O.none)))
        )
        // Add both to result set
        results = M.concat(tags, results)
        // Pop tag off the stack
        stack = removeFromStack(token, stack)
        break
      }

      default: {
        // Add all other tokens to result set immediately
        const info = TagInfo(token, O.none)
        results = RA.cons(IndexedTagInfo(i, info), results)
        break
      }
    }
  }

  return pipe(
    results,
    RA.sort(ordIndexedTagInfo),
    RA.map(({ info }) => info)
  )
}
