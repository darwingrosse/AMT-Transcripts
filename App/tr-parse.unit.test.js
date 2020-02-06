// const trparse = require('./tr-parse');
const trparse = require('./tr-parse');
const shellwords = require('shellwords');
const docopt = require('docopt');
const each = require('jest-each').default;
const consolecapturer = require('./consolecapturer');

let helper = null
beforeAll( () => {
  helper = (() => {
    const cc = new consolecapturer.ConsoleCapturer
    this.storeLog = cc.storeLog
    this.resetLog = cc.resetLog
    this.unmock_log = cc.unmock_log
    // https://stackoverflow.com/a/45423405/642750
    this.mock_log = cc.mock_log
    this.get_output = cc.get_output
    this.help_output = trparse.doc.trim()
    this.expected_output_short = 
      this.help_output.substring(
        this.help_output.indexOf('Usage:'),
        this.help_output.indexOf('Commands:')
      ).trim()
    return this
  })()
})

afterEach(()=> {
  helper.resetLog()
  helper.unmock_log()
})

test('command line parsing with explicit audio file', () => {
  expect(docopt.docopt(
    trparse.doc, 
    {
      argv: 
        shellwords.split(
          "audio transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019' -o 23.112 -a ../AUDIO/Podcast_005_BMoon.mp3"
        )
    })).toStrictEqual(
      {
        '--audio-file': '../AUDIO/Podcast_005_BMoon.mp3',
        '--audio-offset': '23.112',
        '--help': false,
        '--release-date': 'November 13, 2019',
        '--speaker': [ 'Darwin Grosse', 'Barry Moon' ],
        '--version': false,
        '<json>': 'transcript-0005.json',
        audio: true,
        plain: false
      }
  )
});

test('command line parsing with implicit audio file', () => {
  expect(trparse.get_argv(
        shellwords.split(
          "audio transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019' -o 23.112"
        )
    )).toStrictEqual(
      {
        '--audio-file': '../AUDIO/Podcast_005_BMoon.mp3',
        '--audio-offset': '23.112',
        '--help': false,
        '--release-date': 'November 13, 2019',
        '--speaker': [ 'Darwin Grosse', 'Barry Moon' ],
        '--version': false,
        '<json>': 'transcript-0005.json',
        audio: true,
        plain: false
      }
  )
});

test('command line parsing plain', () => {
  expect(trparse.get_argv(
        shellwords.split(
          "plain transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019'"
        )
    )).toStrictEqual(
      {
        '--audio-file': null,
        '--audio-offset': null,
        '--help': false,
        '--release-date': 'November 13, 2019',
        '--speaker': [ 'Darwin Grosse', 'Barry Moon' ],
        '--version': false,
        '<json>': 'transcript-0005.json',
        audio: false,
        plain: true
      }
  )
});

test('command line default', () => {
  
  helper.mock_log()

  // capture ("mock") exit
  const exit_spy = jest.spyOn(process, "exit");
  exit_spy.mockImplementation(number => number);

  trparse.get_argv([])
  helper.unmock_log()
  expect(exit_spy).toHaveBeenCalledWith(1)

  expect(helper.get_output()).toBe(helper.expected_output_short)

  exit_spy.mockRestore()

});

test('wrong command line (plain + audio file) causes usage output', () => {
  
  helper.mock_log()

  // capture ("mock") exit
  const exit_spy = jest.spyOn(process, "exit");
  exit_spy.mockImplementation(number => number);

  trparse.get_argv(
    shellwords.split(
      "plain transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019' -a bogus.mp3"
    )
  )
  helper.unmock_log()
  expect(exit_spy).toHaveBeenCalledWith(1)

  expect(helper.get_output()).toBe(helper.expected_output_short)

  exit_spy.mockRestore()

});

test('wrong command line (audio - offset) causes usage output', () => {
  
  helper.mock_log()

  // capture ("mock") exit
  const exit_spy = jest.spyOn(process, "exit");
  exit_spy.mockImplementation(number => number);

  trparse.get_argv(
    shellwords.split(
      "audio transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019' -a bogus.mp3"
    )
  )
  helper.unmock_log()
  expect(exit_spy).toHaveBeenCalledWith(1)

  expect(helper.get_output()).toBe(helper.expected_output_short)

  exit_spy.mockRestore()

});

test('wrong command line (wrong command "bogus") causes usage output', () => {
  
  helper.mock_log()

  // capture ("mock") exit
  const exit_spy = jest.spyOn(process, "exit");
  exit_spy.mockImplementation(number => number);

  trparse.get_argv(
    shellwords.split(
      "bogus transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019' -a bogus.mp3"
    )
  )
  helper.unmock_log()
  expect(exit_spy).toHaveBeenCalledWith(1)

  expect(helper.get_output()).toBe(helper.expected_output_short)

  exit_spy.mockRestore()

});

// apparently helper is null when 'each' is set up!
// can't refer to fields in helper in the each array.
each([['-h', trparse.doc.trim()], ['--help', trparse.doc.trim()]]).test(
  'help',
  (option, expected) => {
    const exit_spy = jest.spyOn(process, "exit");
    helper.resetLog(),
    helper.mock_log()
    exit_spy.mockImplementation(number => number);
    trparse.get_argv([option])
    expect(helper.get_output().trim()).toBe(expected)
    expect(exit_spy).toHaveBeenCalled()
    exit_spy.mockRestore()
    helper.unmock_log()
  },
)

test('shellwords sanitiy', () => {
  expect(shellwords.split(
    "audio transcript-0005.json -s 'Darwin Grosse' -s 'Barry Moon' -r 'November 13, 2019' -o 23.112 -a ../AUDIO/Podcast_005_BMoon.mp3"
  )).toStrictEqual([
    "audio", 
    "transcript-0005.json",
    "-s", "Darwin Grosse",
    "-s", "Barry Moon",
    "-r", "November 13, 2019",
    "-o",  "23.112",
    "-a", "../AUDIO/Podcast_005_BMoon.mp3",
  ])
});
