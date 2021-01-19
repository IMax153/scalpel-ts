/**
 * This module is responsible for defining the algorithm which annotates tokens
 * with the calculated offset of their associated closing tag in the parsed token
 * stream.
 *
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
 * @since 0.0.1
 */
import type { Ord } from 'fp-ts/Ord'
import type { Option } from 'fp-ts/Option'
import type { State } from 'fp-ts/State'
import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import * as Order from 'fp-ts/Ord'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RM from 'fp-ts/ReadonlyMap'
import * as S from 'fp-ts/State'
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

type TagMap = ReadonlyMap<string, ReadonlyArray<IndexedToken>>

const IndexedToken = (index: number, token: Token): IndexedToken => ({
  index,
  token
})

const IndexedTagInfo = (index: number, info: TagInfo): IndexedTagInfo => ({
  index,
  info
})

const ordIndexedTagInfo: Ord<IndexedTagInfo> = pipe(
  Order.ordNumber,
  Order.contramap((indexed: IndexedTagInfo) => indexed.index)
)

/**
 * Appends a token to the TagMap.
 */
const appendToken = (x: IndexedToken): Endomorphism<Option<ReadonlyArray<IndexedToken>>> =>
  O.fold(() => pipe(RA.of(x), O.some), flow(RA.cons(x), O.some))

/**
 * Removes a token from the TagMap.
 */
const popToken: Endomorphism<Option<ReadonlyArray<IndexedToken>>> = O.fold(
  constant(O.none),
  RA.tail
)

/**
 * Calculates the offset between the starting tag and the ending tag.
 */
const calculateOffset = (start: IndexedToken) => (end: IndexedToken): IndexedTagInfo => {
  const info = TagInfo(end.token, O.some(start.index - end.index))
  return IndexedTagInfo(end.index, info)
}

/**
 * Associates a tag with its index in the parsed token stream as well as the
 * calculated offset from its closing tag (if present).
 *
 * See steps 1-3 of the algorithm.
 */
const toIndexedTagInfo = (
  index: number,
  token: Token
): State<TagMap, ReadonlyArray<IndexedTagInfo>> =>
  pipe(
    token,
    T.fold({
      TagOpen: (name) =>
        pipe(
          S.modify(alterMap(Eq.eqString)(name, appendToken(IndexedToken(index, token)))),
          S.map(() => RA.empty)
        ),
      TagClose: (name) =>
        pipe(
          S.gets<TagMap, Option<ReadonlyArray<IndexedToken>>>(RM.lookup(Eq.eqString)(name)),
          S.map(
            flow(
              O.chain(RA.head),
              O.traverse(RA.Applicative)(flow(calculateOffset(IndexedToken(index, token)), RA.of)),
              RA.compact,
              RA.cons(IndexedTagInfo(index, TagInfo(token, O.none)))
            )
          ),
          S.chain((tagInfo) =>
            pipe(
              S.modify(alterMap(Eq.eqString)(name, popToken)),
              S.map(() => tagInfo)
            )
          )
        ),
      Text: () => S.of(RA.of(IndexedTagInfo(index, TagInfo(token, O.none)))),
      Comment: () => S.of(RA.of(IndexedTagInfo(index, TagInfo(token, O.none))))
    })
  )

/**
 * Adds all remaining unclosed tags from the token map into the result set
 * without a closing offset.
 *
 * See step 4 of the algorithm.
 */
const toRemaining = (
  processed: ReadonlyArray<IndexedTagInfo>
): State<TagMap, ReadonlyArray<IndexedTagInfo>> =>
  pipe(
    S.get<TagMap>(),
    S.map((map) =>
      pipe(
        map,
        RM.values(
          pipe(
            RA.getOrd(
              pipe(
                Order.ordNumber,
                Order.contramap((t) => t.index)
              )
            )
          )
        ),
        RA.flatten,
        RA.map(({ index, token }) => IndexedTagInfo(index, TagInfo(token, O.none)))
      )
    ),
    S.map((remaining) => RA.getMonoid<IndexedTagInfo>().concat(processed, remaining))
  )

/**
 * Non-recursive solution to sequencing an array of State monads. See step 4 of the algorithm
 * described in
 */
const sequenceState = <S, A>(ss: ReadonlyArray<State<S, A>>): State<S, ReadonlyArray<A>> => (s) => {
  let prevState = s
  const values: Array<A> = []

  for (let i = 0; i < ss.length; i += 1) {
    const [value, nextState] = ss[i](prevState)
    values.push(value)
    prevState = nextState
  }

  return [values, prevState]
}

/**
 * Non-recursive solution to accumulating an array of values into the State monad.
 */
const traverseStateWithIndex = <A, S, B>(f: (i: number, a: A) => State<S, B>) => (
  as: ReadonlyArray<A>
): State<S, ReadonlyArray<B>> => sequenceState(as.map((a, i) => f(i, a)))

/**
 * Annotates each parsed tag with the the offset to its closing tag, if present.
 *
 * @category constructors
 * @since 0.0.1
 */
export const annotateTags = (tokens: ReadonlyArray<Token>): ReadonlyArray<TagInfo> =>
  pipe(
    tokens,
    traverseStateWithIndex(toIndexedTagInfo),
    S.map(RA.flatten),
    S.chain(toRemaining),
    S.evaluate<TagMap>(RM.empty),
    RA.sort(ordIndexedTagInfo),
    RA.map(({ info }) => info)
  )

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Alters a value `V` at the key `K`, or absence thereof.
 *
 * Can be used to insert, delete, or update a value in a `ReadonlyMap`.
 *
 * @internal
 * @since 0.0.1
 */
export const alterMap = <K>(E: Eq.Eq<K>) => <V>(key: K, f: Endomorphism<Option<V>>) => (
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
