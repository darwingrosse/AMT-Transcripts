const consolecapturer = require('./consolecapturer');

test('redirect output', () => {
  const TEST_STRING = "SOME TEST string"
  const cc = new consolecapturer.ConsoleCapturer
  cc.mock_log()

  console.log(TEST_STRING)
  expect(cc.get_output()).toBe(TEST_STRING)

})
