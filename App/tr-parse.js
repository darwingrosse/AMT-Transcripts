#!/usr/bin/env node

const glob = require('glob');
const path = require('path');
const transcriptionJsonToHtml = require('./transcriptionJsonToHtml');
const argv = require('yargs')
  .option('speakers', {
    alias: 's',
    describe: 'speakers',
    demandOption: true,
    array: true,
    global: true,

  })
  .option('release-date', { // (will be renamed to releaseDate)
    alias: 'r',
    describe: 'release date, e.g. \'November 25, 2019\'',
    demandOption: true,
    nargs: 1,
    global: true,
  })
  .command(['plain <json>', '$0'], 'generate plain html from json, filtering out cruft', yargs => {
    return build_positional(yargs)
  })
  .command('audio <json>', 'generate html with audio support', 
    yargs => { // builder
      return build_positional(yargs)
        .option('audio-file', {
          alias: 'a',
          describe: 'audio file',
          nargs: 1,
        })
        .option('audio-offset', { 
          alias: 'o',
          describe: 'audio file offset when speech starts in seconds [float]',
          demandOption: true,
          nargs: 1,
        })
    },
    argv => { // handler
      if(!argv.audioFile) {
        try {
          find_audio_file(argv)
        } catch (e) {
          console.log(e.message)
          process.exit(1);
        }
      }
    }
  )
  .strict()
  .help('help').alias('help', 'h').alias('help', '?')
  .argv

json2html = new transcriptionJsonToHtml.TranscriptionJsonToHtml(argv.json, argv.speakers, argv.releaseDate, argv.audioFile, argv.audioOffset);
json2html.doit();

// ---------
// functions
// ---------

/**
 * Creates a positional for the json file. It is realized as a factory
 * in order to avoid code duplication.
 * See: https://github.com/yargs/yargs/issues/1500#issuecomment-560500177
 */
function build_positional(yargs) {
  return yargs.positional('json', {
    describe: 'the json file as found in the ../JSON/ directory',
    nargs: 1,
  })
}

/**
 * Looks for an audio file of the episode determined from the json file name in ../AUDIO
 * If a suitable file is found, the passed argv structure is updated. If no file is found
 * an exception is thrown.
 *
 * @param {Object} argv The argv in which to find the episode information and which to update with the found audio file
 */
function find_audio_file(argv) {
  const URL = 'http://artmusictech.libsyn.com/'
  const fn = path.basename(argv.json, '.json'); // gets rid of optional .json extension and optional directory
  const episode = fn.replace(/\D/g, '');
  const episode_glob = episode.replace(/^0(\d+)/, '?(0)$1');
  const AUDIO_DIR = '../AUDIO';
  podcast = glob.sync(`${AUDIO_DIR}/*${episode_glob}*`) // NOTE: glob notation is OS agnostic, so "/" in paths works across all platforms
  if (!podcast.length) {
    throw new Error(`no audio file given with -a and no suitable audio file found for episode ${episode} in ${AUDIO_DIR}.\n` +
      `Please download episodes into ${AUDIO_DIR} from here: ${URL}`);
  }
  if (podcast.length > 1) {
    throw new Error(`multiple candidates (${podcast.join(', ')}) found in ${AUDIO_DIR} for episode ${episode}.\n` +
      `Either pass a unique name via -a or clean up ${AUDIO_DIR}`);
  }
  argv.audioFile = podcast[0];
  console.log('no audio file provided, using: ' + argv.audioFile);
}
