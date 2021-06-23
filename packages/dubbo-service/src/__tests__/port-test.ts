import getPort from 'get-port'

it('test get port', async () => {
  const port = await getPort()
  expect(port).toBeTruthy()
})
