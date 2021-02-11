import path from 'path'

import cli from '../src/cli/main'
import * as constants from '../src/constants'
import * as utils from '../src/cli/utils'
import runInTempDirectory from '../jest/runInTempDirectory'

describe('cli', () => {
  const inputCssPath = path.resolve(__dirname, 'fixtures/tailwind-input.css')
  const customConfigPath = path.resolve(__dirname, 'fixtures/custom-config.js')
  const esmPackageJsonPath = path.resolve(__dirname, 'fixtures/esm-package.json')
  const defaultConfigFixture = utils.readFile(constants.defaultConfigStubFile)
  const simpleConfigFixture = utils.readFile(constants.simpleConfigStubFile)
  const defaultPostCssConfigFixture = utils.readFile(constants.defaultPostCssConfigStubFile)

  beforeEach(() => {
    console.log = jest.fn()
    process.stdout.write = jest.fn()
  })

  describe('init', () => {
    it('creates a Tailwind config file', () => {
      return runInTempDirectory(() => {
        return cli(['init']).then(() => {
          expect(utils.readFile(constants.defaultConfigFile)).toEqual(simpleConfigFixture)
        })
      })
    })

    it('creates a Tailwind config file and a postcss.config.js file', () => {
      return runInTempDirectory(() => {
        return cli(['init', '-p']).then(() => {
          expect(utils.readFile(constants.defaultConfigFile)).toEqual(simpleConfigFixture)
          expect(utils.readFile(constants.defaultPostCssConfigFile)).toEqual(
            defaultPostCssConfigFixture
          )
        })
      })
    })

    it('creates a full Tailwind config file', () => {
      return runInTempDirectory(() => {
        return cli(['init', '--full']).then(() => {
          expect(utils.readFile(constants.defaultConfigFile)).toEqual(
            defaultConfigFixture.replace('../colors', 'tailwindcss/colors')
          )
        })
      })
    })

    it('creates a .cjs Tailwind config file inside of an ESM project', () => {
      return runInTempDirectory(() => {
        utils.writeFile('package.json', utils.readFile(esmPackageJsonPath))
        return cli(['init']).then(() => {
          expect(utils.readFile(constants.cjsConfigFile)).toEqual(simpleConfigFixture)
        })
      })
    })

    it('creates a .cjs Tailwind config file and a postcss.config.cjs file inside of an ESM project', () => {
      return runInTempDirectory(() => {
        utils.writeFile('package.json', utils.readFile(esmPackageJsonPath))
        return cli(['init', '-p']).then(() => {
          expect(utils.readFile(constants.cjsConfigFile)).toEqual(simpleConfigFixture)
          expect(utils.readFile(constants.cjsPostCssConfigFile)).toEqual(
            defaultPostCssConfigFixture
          )
        })
      })
    })

    it('creates a Tailwind config file in a custom location', () => {
      return runInTempDirectory(() => {
        return cli(['init', 'custom.js']).then(() => {
          expect(utils.exists('custom.js')).toEqual(true)
        })
      })
    })
  })

  describe('build', () => {
    it('compiles CSS file using an input css file', () => {
      return cli(['build', inputCssPath]).then(() => {
        expect(process.stdout.write.mock.calls[0][0]).toContain('.example')
      })
    })

    it('compiles CSS file without an input css file', () => {
      return cli(['build']).then(() => {
        expect(process.stdout.write.mock.calls[0][0]).toContain('normalize.css') // base
        expect(process.stdout.write.mock.calls[0][0]).toContain('.container') // components
        expect(process.stdout.write.mock.calls[0][0]).toContain('.mx-auto') // utilities
      })
    })

    it('compiles CSS file using custom configuration', () => {
      return cli(['build', inputCssPath, '--config', customConfigPath]).then(() => {
        expect(process.stdout.write.mock.calls[0][0]).toContain('400px')
      })
    })

    it('creates compiled CSS file', () => {
      return runInTempDirectory(() => {
        return cli(['build', inputCssPath, '--output', 'output.css']).then(() => {
          expect(utils.readFile('output.css')).toContain('.example')
        })
      })
    })

    it('compiles CSS file with autoprefixer', () => {
      return cli(['build', inputCssPath]).then(() => {
        expect(process.stdout.write.mock.calls[0][0]).toContain('-webkit-max-content')
      })
    })

    it('compiles CSS file without autoprefixer', () => {
      return cli(['build', inputCssPath, '--no-autoprefixer']).then(() => {
        expect(process.stdout.write.mock.calls[0][0]).not.toContain('-webkit-max-content')
      })
    })
  })
})
