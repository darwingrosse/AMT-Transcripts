
class ConsoleCapturer {

  constructor() {
    this.orig_console = console.log
    this.outputData = ''
    this.storeLog = inputs => (this.outputData += inputs)
    this.resetLog = () => (this.outputData = '')
    this.unmock_log = () => { console.log = this.orig_console }
    // https://stackoverflow.com/a/45423405/642750
    this.mock_log = () => { console.log = jest.fn(this.storeLog) }
    this.get_output = () => this.outputData
  }
}

module.exports = {
  ConsoleCapturer : ConsoleCapturer,
}

