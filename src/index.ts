import dedent from 'dedent'
import { promises as fs } from 'fs'
import _ from 'lodash'
import path from 'path'
import {
  defineCliApp,
  getPackageJson,
  isFileExists,
  log,
  setPackageJsonDataItem,
  spawn,
  validateOrThrow,
} from 'svag-cli-utils'
import z from 'zod'

defineCliApp(async ({ cwd, command, args, flags }) => {
  const createConfigFile = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir } = await getPackageJson({ cwd })
    log.green('Creating jest config file...')
    const configPath = path.resolve(packageJsonDir, 'jest.config.js')
    const { fileExists: configExists } = await isFileExists({ filePath: configPath })
    if (configExists) {
      log.toMemory.black(`${configPath}: jest config file already exists`)
      return
    }
    const configName = validateOrThrow({
      zod: z.enum(['base']),
      text: 'Invalid config name',
      data: flags.config || flags.c || 'base',
    })

    const configContent = dedent`import getSvagJestConfig${_.capitalize(configName)} from 'svag-jest/configs/${configName}.js'
    import tsconfigData from './tsconfig.json' with { type: 'json' }
    /** @type {import('ts-jest').JestConfigWithTsJest} */
    export default {
      ...getSvagJestConfig${_.capitalize(configName)}({ tsconfigData }),
    }
    `
    await fs.writeFile(configPath, configContent + '\n')
    log.toMemory.black(`${configPath}: jest config file created`)
  }

  const installDeps = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir, packageJsonPath } = await getPackageJson({ cwd })
    log.green('Installing dependencies...')
    await spawn({ cwd: packageJsonDir, command: 'pnpm i -D svag-jest@latest jest@next @types/jest ts-jest cross-env' })
    log.toMemory.black(`${packageJsonPath}: dependencies installed`)
  }

  const addScriptToPackageJson = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir, packageJsonPath, packageJsonData } = await getPackageJson({ cwd })
    log.green('Adding "test" script to package.json...')
    if (!packageJsonData.scripts) {
      packageJsonData.scripts = {}
    }
    const cmd = 'cross-env NODE_OPTIONS=--experimental-vm-modules jest'
    if (!packageJsonData.scripts?.test) {
      packageJsonData.scripts.test = cmd
      await setPackageJsonDataItem({ cwd: packageJsonDir, key: 'scripts.test', value: cmd })
      log.toMemory.black(`${packageJsonPath}: script "test" added`)
    } else if (packageJsonData.scripts.test.includes('no test specified')) {
      packageJsonData.scripts.test = cmd
      await setPackageJsonDataItem({ cwd: packageJsonDir, key: 'scripts.test', value: cmd })
      log.toMemory.black(`${packageJsonPath}: script "test" updated`)
    } else {
      log.toMemory.black(`${packageJsonPath}: script "test" already exists`)
    }
  }

  switch (command) {
    case 'create-config-file': {
      await createConfigFile()
      break
    }
    case 'install-deps': {
      await installDeps()
      break
    }
    case 'add-script-to-package-json': {
      await addScriptToPackageJson()
      break
    }
    case 'init': {
      await installDeps()
      await createConfigFile()
      await addScriptToPackageJson()
      break
    }
    case 'h': {
      log.black(`Commands:
install-deps
create-config-file
add-script-to-package-json
set-vscode-settings
init — all above together
lint — eslint ...`)
      break
    }
    case 'ping': {
      const { packageJsonDir } = await getPackageJson({ cwd })
      await spawn({ cwd: packageJsonDir, command: 'echo pong' })
      break
    }
    default: {
      log.red('Unknown command:', command)
      break
    }
  }
})
