export interface ITimeoutProps {
  maxTimeout?: number
  onTimeout: () => void
}

export default class Timeout {
  private maxTimeout: number
  private timer: NodeJS.Timer

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
