#!/usr/bin/env node

const glob = require('glob');
const path = require('path');
const docopt = require('docopt');
const transcriptionJsonToHtml = require('./transcriptionJsonToHtml');

// NOTE: docopt is very subtly controlled with its command description:
//       E.g. adding a single space in the wrong place will turn an option
//       with argument into a boolean flag and an independent positional
//       argument, e.g.
//       // this is an option with argument
//       --audio-file -a <audio-file>
//       // this is a boolean flag and an independent positional argument:
//       --audio-file -a  <audio-file>
//       When changing the following doc string, best display it on console
//       to make sure you're getting what you expect. (or write a test!)
const doc = `
Usage:
  tr-parse.js plain <json> -s <speaker>... -r <release-date>
  tr-parse.js audio <json> -s <speaker>... -r <release-date> -o <audio-offset> [ -a <audio-file> ]
  tr-parse.js --help | -h
  tr-parse.js --version | -v

Commands:
  plain                             Generates html only.
  audio                             Generates html with audio embedded.

Options:
  --speaker -s <speaker>...         speaker(s) 
                                    NOTE: Each speaker needs to be preceded by '-s' (or '--speaker')
  --release-date -r <release-date>  e.g. 'November 13, 2019'
  --help -h                         Display help
  --version -v                      Show version number
  --audio-offset -o <audio-offset>  only valid and required for 'audio' command.
  --audio-file -a <audio-file>      only valid and optional for 'audio' command.
                                    If not provided, the respective audio file
                                    is searched for in ../AUDIO according to
                                    episode number retrieved from json file name.

`;

// see https://stackoverflow.com/a/4981943/642750
if (typeof module !== 'undefined' && !module.parent) {
  // this is the main module
  main();
} else {
  // we were require()d from somewhere else or from a browser
  // used for testing
}

function get_argv(argv) {

  const doc_argv = docopt.docopt(doc, {
    argv: argv,
    version: '0.1.1',
  });

  if (doc_argv.audio && doc_argv['--audio-file'] === null) {
    find_audio_file(doc_argv)
  }
  return doc_argv
}

function main() {

  // https://nodejs.org/docs/latest/api/process.html#process_process_argv
  const argv = get_argv(process.argv.splice(2))

  json2html = new transcriptionJsonToHtml.TranscriptionJsonToHtml(
    argv['<json>'], 
    argv['--speaker'], 
    argv['--release-date'], 
    argv['--audio-file'], 
    argv['--audio-offset'], 
  )
  json2html.doit();
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
  const fn = path.basename(argv['<json>'], '.json'); // gets rid of optional .json extension and optional directory
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
  argv['--audio-file'] = podcast[0];
  console.log('no audio file provided, using: ' + argv['--audio-file']);
}

// these are exported for testing purposes only
module.exports = {
  doc: doc,
  get_argv: get_argv,
  find_audio_file: find_audio_file,
}
