import { argumentMap } from '../index'
describe('interpret util test suites', () => {
  it('test', () => {
    const result = argumentMap({ id: 1 })
    expect(result).toEqual([{ id: 1 }])
  })
})
