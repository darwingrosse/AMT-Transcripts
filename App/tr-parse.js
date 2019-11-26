#!/usr/bin/env node

// setup
const utils = require('./utils'); // our utilities
const path = require('path');
const fs = require('fs');
const argv = require('yargs')
  .command('$0 <json>', 'generate html from json, filtering out cruft', (yargs) => {
    yargs.positional('json', {
      describe: 'the json file as found in the ../JSON/ directory',
      default: 'transcript-0005',
    })
    .option('speaker', {
      alias: 's',
      describe: 'speaker',
      demandOption: true,
      array: true,
    })
    .option('released', {
      alias: 'r',
      describe: 'release date, e.g. \'November 25, 2019\'',
      default: utils.formatDate(),
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

if (argv.audio_file && !fs.existsSync(argv.audio_file)){
  throw argv.audio_file + " does not exist.";
}

const speakers = argv.speaker.map( i => new utils.Speaker(i) )
const guests = argv.speaker.slice(1)

const fn = path.basename(argv.json, '.json'); // gets rid of optional .json extension and optional directory
const episode = fn.replace(/\D/g, '')

const inFileName = '../JSON/' + fn + '.json';
const outFileName = '../HTML/' + fn + (argv.audio_file ? '_audio' : '') + '.html';

const fileContent = fs.readFileSync(inFileName, 'utf-8');
const data = JSON.parse(fileContent);
var chunk, i;

console.log("Parse complete, " + data.monologues.length + " entries.");

// console.log("Contents of data.monologues[0]:");
// console.log(data.monologues[0]);
// console.log();

console.log("data.monologues[0] attempting build-up...");
var para = utils.make_html_start_text(episode, guests, argv);

var chunkStartTimeToIdx = {}

// Collect indices to chunks with chunk.ts as the key.
// We can implement a step in between to handle/delete/coalesce chunks
// right within the json before rendering to HTML.
// Already in this pass we get rid of um, uh.
for (var x=0; x<data.monologues.length; x++) {
  chunk = data.monologues[x].elements;
  var i = 0
  var j = 0
  chunks_to_delete = []
  while ( i < chunk.length ) {
    var this_chunk = chunk[i]
    if (this_chunk.value.match(/^u[mh]$/i)) {
      chunks_to_delete.push(i++) // u[mh]
      if (i <chunk.length) {
        chunks_to_delete.push(i++) // , 
      }
      if (i <chunk.length) {
        chunks_to_delete.push(i++) // blank
      }
      if (this_chunk.value[0] == 'U' && i <chunk.length) {
        chunk[i].value = chunk[i].value[0].toUpperCase() + chunk[i].value.substring(1)
      }
    } else {
      chunkStartTimeToIdx[ this_chunk.ts ] = [x, j++]
      i++
    }
  }
  chunks_to_delete = chunks_to_delete.reverse() // delete from the end, so indices remain valid
  for (i = 0; i < chunks_to_delete.length; ++i) {
    chunk.splice(chunks_to_delete[i], 1)
  }
}

episode_specific_json_fixes(episode)

for (var x=0; x<data.monologues.length; x++) {
  
  speaker_idx = data.monologues[x].speaker;
  if (speaker_idx >= speakers.length) {
    throw inFileName + " contains more speakers (>= " + (speaker_idx + 1) + ") than were provided via -s (" + speakers.length + ")";
  }
  para += "<p>" + '\n' + "<b>" + speakers[speaker_idx].getName() + ": </b>";
  chunk = data.monologues[x].elements;

  for (i=0; i<chunk.length; i++) {
    para += utils.handleChunk(argv, chunk[i]);
  }

  para += '\n</p>\n\n';
}

// post-processing
console.log("post-processing...");

para = utils.recoverGuestCapitalization(para, guests)
para = utils.fix_products(para)
para = utils.episode_specific_html_fixes(para, episode)


para += utils.make_html_end_text(argv);
fs.writeFileSync(outFileName, para);
console.log('created ' + outFileName);
console.log('complete');

/**
 * Fixes the chunk at startTime, applying the func
 *
 * @param {string} startTime The start time of the chunk to fix
 * @param {function} func The function to apply to the chunk
 */
function patch_json(startTime, func){
  monologue_chunks = chunkStartTimeToIdx[startTime]
  chunk = data.monologues[monologue_chunks[0]].elements[monologue_chunks[1]]
  func(chunk)
}

/**
 * Looks for episode-specific json fixes and invokes them if found.
 *
 * @param {string} text The html text to fix
 * @param {int} episode The episode this fix is pertaining to
 * @return {string} The fixed html text.
 */
function episode_specific_json_fixes(episode) {
  func_name = 'fix_json_' + episode
  if (eval("typeof " + func_name) === "function") {
    console.log('applying episode ' + episode + '-specific json fixes')
    eval(func_name + "()")
  }
}

function fix_json_0005() {
  patch_json('367.74', chunk => chunk.confidence = 1)
  patch_json('1311.56', chunk => chunk.confidence = 1)
  patch_json('1480.08', chunk => chunk.confidence = 1)
  patch_json('1483.36', chunk => chunk.confidence = 1)
  patch_json('2179.68', chunk => chunk.value = 'looked')
}

