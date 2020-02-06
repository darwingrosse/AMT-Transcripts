const transcriptionJsonToHtml = require('./transcriptionJsonToHtml');
const consolecapturer = require('./consolecapturer');
const fs = require('fs')

test('formats date correctly', () => {
  expect(transcriptionJsonToHtml.formatDate(new Date('2013-10-14'))).toBe('October 14, 2013');
});

test('transcriptionJsonToHtml.Speaker returns name correctly', () => {
  speaker = new transcriptionJsonToHtml.Speaker('Darwin Grosse');
  expect(speaker.getName()).toBe('Darwin Grosse');
  expect(speaker.getName()).toBe('Darwin');
  expect(speaker.getName()).toBe('Darwin');
  expect(speaker.getName()).toBe('Darwin');
  expect(speaker.getName()).toBe('Darwin');
});

test('mocking normalize json and html file names', () => {
  const JSON = 'the json file name';
  const HTML = 'the html file name';
  transcriptionJsonToHtml.TranscriptionJsonToHtml.prototype.normalize_json_filename = jest.fn( () => JSON)
  transcriptionJsonToHtml.TranscriptionJsonToHtml.prototype.normalize_html_filename = jest.fn( () => HTML)
  j2h = new transcriptionJsonToHtml.TranscriptionJsonToHtml(
    'bla.json', 
    ['Darwin Grosse', 'Barry Moon'], 
    'November 13, 2013', 
    null, 
    null, 
  )
  expect(j2h.inFileName).toBe(JSON)
  expect(j2h.outFileName).toBe(HTML)
});

test('surplus number of speakers in json handled properly', () => {
  const cc = new consolecapturer.ConsoleCapturer
  cc.mock_log()
  const JSON = '__test__/speaker-test.json';
  const HTML = '__test__/speaker-test.html';

  fs.unlink(HTML, (err) => {}); // ignore if deletion failed.

  transcriptionJsonToHtml.TranscriptionJsonToHtml.prototype.normalize_json_filename = jest.fn( () => JSON)
  transcriptionJsonToHtml.TranscriptionJsonToHtml.prototype.normalize_html_filename = jest.fn( () => HTML)
  j2h = new transcriptionJsonToHtml.TranscriptionJsonToHtml(
    'bla.json', 
    ['Darwin Grosse', 'Barry Moon'], 
    'November 13, 2013', 
    null, 
    null, 
  )
  expect(j2h.inFileName).toBe(JSON)
  expect(j2h.outFileName).toBe(HTML)
  j2h.doit()
  expect(cc.get_output()).toContain('json contains more speakers (4) than were provided via -s (2)')

  const html = fs.readFileSync(HTML, 'utf8')

  expect(html).toContain('UNKNOWN_SPEAKER_01')
  expect(html).toContain('UNKNOWN_SPEAKER_02')

  // assert order of UNKNOWN_SPEAKER_01 and UNKNOWN_SPEAKER_02 occurrences
  const regex01 = /UNKNOWN_SPEAKER_01/g
  const regex02 = /UNKNOWN_SPEAKER_02/g
  let result01, result02, indices01 = [],  indices02 = []
  while ( result01 = regex01.exec(html)) indices01.push(result01.index)
  while ( result02 = regex02.exec(html)) indices02.push(result02.index)
  expect(indices01[0]).toBeLessThan(indices02[0]) // 1st UNKNOWN_SPEAKER_01 occurs before 1st UNKNOWN_SPEAKER_02
  expect(indices02[0]).toBeLessThan(indices01[1]) // 1st UNKNOWN_SPEAKER_02 occurs before 2nd UNKNOWN_SPEAKER_01
  expect(indices01[1]).toBeLessThan(indices02[1]) // 2nd UNKNOWN_SPEAKER_01 occurs before 2nd UNKNOWN_SPEAKER_02

  cc.unmock_log()
});

test('surplus number of speakers on command line handled properly', () => {
  const cc = new consolecapturer.ConsoleCapturer
  cc.mock_log()
  const JSON = '__test__/speaker-test-surplus-cmdline.json';
  const HTML = '__test__/speaker-test-surplus-cmdline.html';
  const SPEAKERS_IN_JSON = 2;

  fs.unlink(HTML, (err) => {}); // ignore if deletion failed.

  const speakers = ['Darwin Grosse', 'Barry Moon', 'John Doe', 'Jane Doe'] 

  transcriptionJsonToHtml.TranscriptionJsonToHtml.prototype.normalize_json_filename = jest.fn( () => JSON)
  transcriptionJsonToHtml.TranscriptionJsonToHtml.prototype.normalize_html_filename = jest.fn( () => HTML)
  j2h = new transcriptionJsonToHtml.TranscriptionJsonToHtml(
    'bla.json', 
    speakers, 
    'November 13, 2013', 
    null, 
    null, 
  )
  expect(j2h.inFileName).toBe(JSON)
  expect(j2h.outFileName).toBe(HTML)
  j2h.doit()
  expect(cc.get_output()).toContain(
    `WARNING: ${speakers.length-SPEAKERS_IN_JSON} surplus speakers were specified on the command line: ${speakers.slice(SPEAKERS_IN_JSON)} that did not occur in ${JSON}`
  )

  cc.unmock_log()
});
