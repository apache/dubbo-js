import { join } from 'path'
import { publish, TPkgs } from './helper'

const cwd = process.cwd()

/**
 * data driven
 * @returns
 */
export const npmRelease = () =>
  publish([
    {
      pkg: require(join(cwd, './packages/dubbo-common/package.json'))
    },
    {
      pkg: require(join(cwd, './packages/dubbo-registry/package.json'))
    },
    {
      pkg: require(join(cwd, './packages/dubbo-serialization/package.json'))
    },
    {
      pkg: require(join(cwd, './packages/dubbo-service/package.json')),
      deps: [
        { moduleName: 'dubbo-common' },
        { moduleName: 'dubbo-serialization' },
        { moduleName: 'dubbo-registry' }
      ]
    },
    {
      pkg: require(join(cwd, './packages/dubbo-consumer/package.json')),
      deps: [
        { moduleName: 'dubbo-common' },
        { moduleName: 'dubbo-serialization' },
        { moduleName: 'dubbo-registry' }
      ]
    }
  ] as TPkgs)
