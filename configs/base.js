import { pathsToModuleNameMapper } from 'ts-jest'

// /** @type {import('ts-jest').JestConfigWithTsJest} */
/** @type {(props: { tsconfigData?: { compilerOptions?: { paths?: Record<string, string[]> } } }) => import('ts-jest').JestConfigWithTsJest} */
export default ({ tsconfigData } = {}) => {
  return {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    passWithNoTests: true,
    verbose: true,
    ...(!!tsconfigData?.compilerOptions?.paths && {
      moduleNameMapper: pathsToModuleNameMapper(tsconfigData.compilerOptions.paths, { prefix: '<rootDir>/' }),
    }),
  }
}
