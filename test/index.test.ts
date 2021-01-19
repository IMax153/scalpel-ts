import * as assert from 'assert'
import * as glob from 'glob'
import * as path from 'path'

const getExportName = (name: string): string =>
  name.substring(0, 1).toLowerCase() + name.substring(1)

const getModuleNames = (): ReadonlyArray<string> =>
  glob
    .sync('./src/**/*.ts', { ignore: './src/Internal/**/*.ts' })
    .map((file) => path.parse(file).name)

describe('index', () => {
  it('check exported modules', () => {
    const moduleNames = getModuleNames()
    /* eslint-disable-next-line @typescript-eslint/no-var-requires, global-require */
    const scalpel = require('../src')

    moduleNames.forEach((name) => {
      if (name !== 'index') {
        const exportName = getExportName(name)

        assert.deepStrictEqual(
          scalpel[exportName] !== undefined,
          true,
          `The "${name}" module is not exported in src/index.ts as ${exportName}`
        )
      }
    })
  })
})
