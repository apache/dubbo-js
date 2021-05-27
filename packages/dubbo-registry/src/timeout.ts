import { ITimeoutProps } from './types'

export default class Timeout {
  private readonly maxTimeout: number
  private readonly timer: NodeJS.Timer

  constructor(props: ITimeoutProps) {
    this.maxTimeout = props.maxTimeout || 10 * 1000
    this.timer = setTimeout(() => {
      this.clearTimeout()
      props.onTimeout()
    }, this.maxTimeout)
  }

  clearTimeout() {
    clearTimeout(this.timer)
  }
}
