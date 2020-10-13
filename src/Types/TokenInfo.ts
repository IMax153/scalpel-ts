import * as Eq from 'fp-ts/Eq'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RM from 'fp-ts/ReadonlyMap'
import { flow, pipe, Endomorphism } from 'fp-ts/function'

import * as T from '../Html/Token'

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
export interface TokenInfo {
  /**
   * The name of the parsed token, if present. Tokens that have associated names
   * include:
   * - `TagOpen`
   * - `TagSelfClose`
   * - `TagClose`
   * - `Doctype`
   */
  readonly name: O.Option<string>
  /**
   * The parsed token.
   */
  readonly token: T.Token
  /**
   * The offset from the parsed token to the token that contains its closing tag,
   * if present. The only tokens that will have an offset are `TagOpen` tokens.
   */
  readonly closeOffset: O.Option<number>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.0.1
 */
export const TokenInfo = (
  name: O.Option<string>,
  token: T.Token,
  closeOffset: O.Option<number>
): TokenInfo => ({
  name,
  token,
  closeOffset
})

interface IndexedToken {
  readonly index: number
  readonly token: T.Token
}

interface IndexedTokenInfo {
  readonly index: number
  readonly tokenInfo: TokenInfo
}

const tokenName: (token: T.Token) => O.Option<string> = T.fold({
  TagOpen: (name) => O.some(name),
  TagSelfClose: (name) => O.some(name),
  TagClose: (name) => O.some(name),
  ContentText: () => O.none,
  ContentChar: () => O.none,
  Comment: () => O.none,
  Doctype: () => O.some('doctype')
})

/**
 * Alters a value `V` at the key `K`, or absence thereof. Can be used to insert, delete,
 * or update a value in a `ReadonlyMap`.
 */
const alterMap = <K>(E: Eq.Eq<K>) => <V>(key: K, f: Endomorphism<O.Option<V>>) => (
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

const appendToken = (token: IndexedToken): Endomorphism<O.Option<ReadonlyArray<IndexedToken>>> =>
  O.fold(
    () => O.some(RA.of(token)),
    (xs) => pipe(xs, RA.cons(token), O.some)
  )

const popToken: Endomorphism<O.Option<ReadonlyArray<IndexedToken>>> = O.fold(
  () => O.none,
  (xs) => RA.tail(xs)
)

const calculateOffset = (start: IndexedToken) => (end: IndexedToken): IndexedTokenInfo => {
  const info = TokenInfo(tokenName(start.token), end.token, O.some(start.index - end.index))
  return { index: end.index, tokenInfo: info }
}

const ordIndexedTokenInfo: Ord.Ord<IndexedTokenInfo> = pipe(
  Ord.ordNumber,
  Ord.contramap(({ index }) => index)
)

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
export const annotateTokens: (tokens: ReadonlyArray<T.Token>) => ReadonlyArray<TokenInfo> = (
  tokens
) => {
  const go = (indexedTokens: ReadonlyArray<IndexedToken>) => (
    tokenMap: ReadonlyMap<string, ReadonlyArray<IndexedToken>>
  ): ReadonlyArray<IndexedTokenInfo> =>
    pipe(
      indexedTokens,
      RA.foldLeft(
        () =>
          // At this point there are no more tokens in the stream to process, so all
          // remaining tags are added to the result set without a closing offset
          pipe(
            tokenMap,
            RM.collect(Ord.ordString)((_, v) => v),
            RA.flatten,
            RA.map(({ index, token }) => ({
              index,
              tokenInfo: TokenInfo(tokenName(token), token, O.none)
            }))
          ),
        (x, xs) =>
          pipe(
            x.token,
            T.fold({
              TagOpen: (name) =>
                pipe(tokenMap, alterMap(Eq.eqString)(name, appendToken(x)), go(xs)),
              TagSelfClose: (name) =>
                pipe(
                  tokenMap,
                  go(xs),
                  RA.cons({ index: x.index, tokenInfo: TokenInfo(O.some(name), x.token, O.none) })
                ),
              TagClose: (name) =>
                pipe(
                  tokenMap,
                  RM.lookup(Eq.eqString)(name),
                  O.chain(RA.head),
                  O.traverse(RA.Applicative)(flow(calculateOffset(x), RA.of)),
                  RA.cons(
                    O.some({ index: x.index, tokenInfo: TokenInfo(O.some(name), x.token, O.none) })
                  ),
                  RA.compact,
                  (ys) =>
                    RA.getMonoid<IndexedTokenInfo>().concat(
                      ys,
                      pipe(tokenMap, alterMap(Eq.eqString)(name, popToken), go(xs))
                    )
                ),
              ContentText: () =>
                pipe(
                  tokenMap,
                  go(xs),
                  RA.cons({ index: x.index, tokenInfo: TokenInfo(O.none, x.token, O.none) })
                ),
              ContentChar: () =>
                pipe(
                  tokenMap,
                  go(xs),
                  RA.cons({ index: x.index, tokenInfo: TokenInfo(O.none, x.token, O.none) })
                ),
              Comment: () =>
                pipe(
                  tokenMap,
                  go(xs),
                  RA.cons({ index: x.index, tokenInfo: TokenInfo(O.none, x.token, O.none) })
                ),
              Doctype: () =>
                pipe(
                  tokenMap,
                  go(xs),
                  RA.cons({
                    index: x.index,
                    tokenInfo: TokenInfo(O.some('doctype'), x.token, O.none)
                  })
                )
            })
          )
      )
    )
  return pipe(
    RM.empty,
    go(
      pipe(
        tokens,
        RA.mapWithIndex((index, token) => ({ index, token }))
      )
    ),
    RA.sort(ordIndexedTokenInfo),
    RA.map(({ tokenInfo }) => tokenInfo)
  )
}
