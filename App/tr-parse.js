#!/usr/bin/env node

const transcriptionJsonToHtml = require('./transcriptionJsonToHtml');
const argv = require('yargs')
  .command('$0 <json>', 'generate html from json, filtering out cruft', (yargs) => {
    yargs.positional('json', {
      describe: 'the json file as found in the ../JSON/ directory',
      default: 'transcript-0005',
    })
    .option('speakers', {
      alias: 's',
      describe: 'speakers',
      demandOption: true,
      array: true,
    })
    .option('release_date', {
      alias: 'r',
      describe: 'release date, e.g. \'November 25, 2019\'',
      default: transcriptionJsonToHtml.formatDate(),
    })
    .option('audio_file', {
      alias: 'a',
      describe: 'audio file',
    })
    .option('audio_offset', {
      alias: 'o',
      describe: 'audio file offset when speech starts in seconds [float]',
    }) // TODO: The audio_offset should be mandatory, but only when an audio_file is passed on the command line.
  })
  .help()
  .argv

json2html = new transcriptionJsonToHtml.TranscriptionJsonToHtml(argv.json, argv.speakers, argv.release_date, argv.audio_file, argv.audio_offset);
json2html.doit();
