import { argumentMap } from '../dj'

describe('interpret util test suites', () => {
  it('test argument map', () => {
    const result = argumentMap({ id: 1 })
    expect(result).toEqual([{ id: 1 }])
  })
})
