const utils = require('./transcriptionJsonToHtml');

test('formats date correctly', () => {
  expect(utils.formatDate(new Date('2013-10-14'))).toBe('October 14, 2013');
});

test('utils.Speaker returns name correctly', () => {
  speaker = new utils.Speaker('Darwin Grosse');
  expect(speaker.getName()).toBe('Darwin Grosse');
  expect(speaker.getName()).toBe('Darwin');
  expect(speaker.getName()).toBe('Darwin');
  expect(speaker.getName()).toBe('Darwin');
  expect(speaker.getName()).toBe('Darwin');
});
