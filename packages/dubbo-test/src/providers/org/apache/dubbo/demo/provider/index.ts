import { BasicTypeProvider } from './BasicTypeProvider'
import { DemoProvider } from './DemoProvider'
import { ErrorProvider } from './ErrorProvider'

export default {
  BasicTypeProvider: new BasicTypeProvider(),
  DemoTypeProvider: new DemoProvider(),
  ErrorProvider: new ErrorProvider()
}
