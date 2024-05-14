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
import { fileURLToPath } from 'url'
import z from 'zod'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

defineCliApp(async ({ cwd, command, args, argr, flags }) => {
  const createConfigFile = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir } = await getPackageJson({ cwd })
    log.green('Creating prettier config file...')
    const configPath = path.resolve(packageJsonDir, '.prettierrc.js')
    const { fileExists: configExists } = await isFileExists({ filePath: configPath })
    if (configExists) {
      log.toMemory.black(`${configPath}: prettier config file already exists`)
      return
    }
    const configName = validateOrThrow({
      zod: z.enum(['base']),
      text: 'Invalid config name',
      data: flags.config || flags.c || 'base',
    })

    const configContent = dedent`import svagPrettierConfig${_.capitalize(configName)} from 'svag-prettier/configs/${configName}.js'
    /** @type {import("prettier").Config} */
    export default {
      ...svagPrettierConfig${_.capitalize(configName)},
    }
    `
    await fs.writeFile(configPath, configContent + '\n')
    log.toMemory.black(`${configPath}: prettier config file created`)
  }

  const createIgnoreFile = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir } = await getPackageJson({ cwd })
    log.green('Creating prettier ignore file...')
    const projectIgnorePath = path.resolve(packageJsonDir, '.prettierignore')
    const { fileExists: projectIgnoreExists } = await isFileExists({ filePath: projectIgnorePath })
    if (projectIgnoreExists) {
      log.toMemory.black(`${projectIgnorePath}: prettier ignore file already exists`)
      return
    }

    const srcIgnorePath = path.resolve(__dirname, '../.prettierignore')
    const ignoreContent = await fs.readFile(srcIgnorePath, 'utf-8')
    await fs.writeFile(projectIgnorePath, ignoreContent)
    log.toMemory.black(`${projectIgnorePath}: prettier ignore file created`)
  }

  const installDeps = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir, packageJsonPath } = await getPackageJson({ cwd })
    log.green('Installing dependencies...')
    await spawn({ cwd: packageJsonDir, command: 'pnpm i -D svag-prettier@latest prettier' })
    log.toMemory.black(`${packageJsonPath}: dependencies installed`)
  }

  const addScriptToPackageJson = async () => {
    cwd = path.resolve(cwd, args[0] || '.')
    const { packageJsonDir, packageJsonData, packageJsonPath } = await getPackageJson({ cwd })
    log.green('Adding "prettify" script to package.json...')
    if (!packageJsonData.scripts?.prettify) {
      await setPackageJsonDataItem({ cwd: packageJsonDir, key: 'scripts.prettify', value: 'svag-prettier prettify' })
      log.toMemory.black(`${packageJsonPath}: script "prettify" added`)
    } else {
      log.toMemory.black(`${packageJsonPath}: script "prettify" already exists`)
    }
  }

  switch (command) {
    case 'create-config-file': {
      await createConfigFile()
      break
    }
    case 'create-ignore-file': {
      await createIgnoreFile()
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
      await createIgnoreFile()
      await addScriptToPackageJson()
      break
    }
    case 'prettify': {
      const { packageJsonDir } = await getPackageJson({ cwd })
      await spawn({
        cwd: packageJsonDir,
        command: `pnpm prettier --log-level warn --cache --write "./**/*.{ts,tsx,js,json,yml,scss}" ${argr.join(' ')}`,
        exitOnFailure: true,
      })
      break
    }
    case 'h': {
      log.black(dedent`Commands:
        install-deps
        create-config-file
        add-script-to-package-json
        init — all above together
        prettify — prettier ...
      `)
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
