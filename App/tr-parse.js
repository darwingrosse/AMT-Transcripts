#!/usr/bin/env node

// -------
// classes
// -------

/**
 * this class provides a method getName(), which on first invocation returns
 * the full name,
 * on subsequent invocations returns only the first name.
 */
class Speaker {

  /**
   * constructor
   * @param {string} name The name, usually first, last name.
   */
  constructor(name) {
    this.full_name = name;
    this.first_name = name.split(/\s/).shift();
    this.first = true;
  }

  /**
   * on first invocation returns the full name,
   * on subsequent invocations returns only the first name.
   * @return {string} the name
   */
  getName() {
    if (this.first) {
      this.first = false;
      return this.full_name;
    } else {
      return this.first_name;
    }
  }

}

// setup
const fs = require('fs');
const argv = require('yargs')
  .command('$0 <json>', 'generate html from json, filtering out cruft', (yargs) => {
    yargs.positional('json', {
      describe: 'the stem of the json file as found in the ../JSON/ directory (but lacking ".json" extension)',
      default: 'transcript-0005',
    })
    .option('speaker', {
      alias: 's',
      describe: 'speaker',
      default: 'Darwin Grosse',
      demandOption: true,
      array: true,
    })
    .option('released', {
      alias: 'r',
      describe: 'release date',
      default: formatDate(),
    })
  })
  .help()
  .argv

const speakers = argv.speaker.map( i => new Speaker(i) )
const guests = argv.speaker.slice(1)

var isErrored = false;
const fn = argv.json.replace(/\.json$/, '')

const inFileName = '../JSON/' + fn + '.json';
const outFileName = '../HTML/' + fn + '.html';
const episode = fn.replace(/\D/g, '')

const fileContent = fs.readFileSync(inFileName, 'utf-8');
const data = JSON.parse(fileContent);
var chunk, i;

const start_text =
  '<!DOCTYPE html>' + '\n' +
  '<html lang="en">' + '\n' +
  '' + '\n' +
  '<head>' + '\n' +
  '  <meta charset="utf-8">' + '\n' +
  '  <meta http-equiv="X-UA-Compatible" content="IE=edge">' + '\n' +
  '  <meta name="viewport" content="width=device-width, initial-scale=1">' + '\n' +
  '  <!-- The above 3 meta tags *must* come first in the head; any other head ' +
  'content must come *after* these tags -->' + '\n' +
  '  <title>Bootstrap 101 Template</title>' + '\n' +
  '' + '\n' +
  '  <!-- Bootstrap -->' + '\n' +
  '  <link href="css/bootstrap.min.css" rel="stylesheet">' + '\n' +
  '' + '\n' +
  '  <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->' + '\n' +
  '  <!-- WARNING: Respond.js does not work if you view the page via file:/' + '/ -->' + '\n' +
  '  <!--[if lt IE 9]>' + '\n' +
  '      <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>' + '\n' +
  '      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>' + '\n' +
  '    <![endif]-->' + '\n' +
  '</head>' + '\n' +
  '' + '\n' +
  '<body>' + '\n' +
  '  <div class="container">' + '\n' +
  '    <h2>Transcription: ' + guests.join(", ") + '</h2>' + '\n' +
  '    <h3>Released: ' + argv.released + '</h3>' + '\n'

const this_year = new Date().getFullYear();
const release_year = new Date(argv.released).getFullYear();

const end_text =
  '<p><i>Copyright ' + release_year + (this_year != release_year ? ('-' + this_year) : '' ) + ' by Darwin Grosse. All right reserved.</i></p>' +
  '</div>' + '\n' +
  '<!-- jQuery (necessary for the Bootstrap JavaScript plugins) -->' + '\n' +
  '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>' + '\n' +
  '<!-- Include all compiled plugins (below), or include individual files as needed -->' + '\n' +
  '<script src="js/bootstrap.min.js"></script>' + '\n' +
  '</body>' + '\n' +
  '' + '\n' +
  '</html>' + '\n'

var para = '';

console.log("Parse complete, " + data.monologues.length + " entries.");

// console.log("Contents of data.monologues[0]:");
// console.log(data.monologues[0]);
// console.log();

console.log("data.monologues[0] attempting build-up...");
para += start_text;

for (var x=0; x<data.monologues.length; x++) {
  
  speaker_idx = data.monologues[x].speaker;
  if (speaker_idx >= speakers.length) {
    throw inFileName + " contains more speakers (>= " + (speaker_idx + 1) + ") than were provided via -s (" + speakers.length + ")";
  }
  para += "<p>" + '\n' + "<b>" + speakers[speaker_idx].getName() + ": </b>";
  chunk = data.monologues[x].elements;

  for (i=0; i<chunk.length; i++) {
    para += handleChunk(chunk[i]);
  }

  para += '\n' + "</p>" + '\n' + '\n'
}

// post-processing
console.log("post-processing...");

para = um(para)
para = recoverGuestCapitalization(para)
para = fix_products(para)
para = episode_specific_fixes(para, episode)


para += end_text;
fs.writeFileSync(outFileName, para);
console.log('created ' + outFileName);
console.log('complete');


// ----------
// functions
// ----------

/**
 * Handles the given chunk
 *
 * @param {chunk} chunk The chunk to turn into text.
 * @return {string} The resulting text.
 */
function handleChunk(chunk) {
  dispatch = {
    "text" : 
      chunk => surround(chunk,
        chunk => chunk.value
      ),
    "punct" : 
      chunk => surround(chunk,
        chunk => chunk.value
      ),
    "unknown" : 
      chunk => surround(chunk,
        chunk => "***" + chunk.value + "***",
        chunk => chunk.confidence = 0
      ),
  }

  if (chunk.type in dispatch) {
    return dispatch[chunk.type](chunk)
  } else {
    return chunk => surround(chunk,
      chunk => "[" + chunk.type + "]",
      chunk => chunk.confidence = 0
    )
  }
}

/**
 * surrounds the given chunk with span depending on confidence of transcript
 *
 * @param {chunk} chunk The chunk to surround
 * @param {function} func The function to process the chunk's text
 * @param {function} prefunc The optional function to preprocess the chunk
 * @return {string} The chunk rendered as text
 */
function surround(chunk, func, prefunc) {
  if (prefunc) {
    prefunc(chunk)
  }
  return setColorStart(chunk) + func(chunk) + setColorEnd();
}

function setColorStart(chunk) {
  const v = chunk.confidence
  let text = ''
  if ((v < 0.5) && (!isErrored)) {
//    text += '<span style="color:red">';
    text += '__';
    isErrored = true;
  }
  return text
}

function setColorEnd() {
  let text = ''
  if (isErrored) {
    text += '__';
//    text += '</span>';
    isErrored = false;
  }
  return text
}

/**
 * Replaces all 'find's in 'str' by 'replace'.
 *
 * @param {string} str The text to fix
 * @param {string/RegExp} find The text/RegExp to find
 * @return {string} replace The replacement text
 */
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

/**
 * Replaces product names with corrections and adds links.
 *
 * @param {string} text The text to fix
 * @return {string} The fixed text
 */
function fix_products(text) {
  text = replaceAll(text, '(?:Maximus|[Mm]aximize) P', '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max/MSP</a>');
  text = replaceAll(text, '__Macs__', '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max</a>');
  text = replaceAll(text, 'PD', '<a href="https://en.wikipedia.org/wiki/Pure_Data">PD</a>');
  text = text.replace(/cycling 74/i, '<a href="https://en.wikipedia.org/wiki/Cycling_%2774">Cycling \'74</a>');
  return text
}

/**
 * Deletes all 'um, uh'.
 *
 * @param {string} text The text to fix
 * @return {string} The fixed text
 */
function um(text) {
  text = replaceAll(text, /__um__, /g, '');
  text = replaceAll(text, /\bum, /g, '');
  text = replaceAll(text, /__um__ /g, '');
  text = replaceAll(text, /\bum /g, '');
  text = replaceAll(text, /__uh__, /g, '');
  text = replaceAll(text, /\buh, /g, '');
  text = replaceAll(text, /__uh__ /g, '');
  text = replaceAll(text, /\buh /g, '');
  text = text.replace(/Um, (\w)/g, (m,p) => p.toUpperCase() )
  text = text.replace(/Uh, (\w)/g, (m,p) => p.toUpperCase() )
  return text
}

/**
 * Looks for episode-specific fixes and invokes them if found.
 *
 * @param {string} text The text to fix
 * @param {int} episode The episode this fix is pertaining to
 * @return {string} The fixed text.
 */
function episode_specific_fixes(text, episode) {
  func_name = 'fix_' + episode
  if (eval("typeof " + func_name) === "function") {
    console.log('applying episode ' + episode + '-specific fixes')
    eval("text = " + func_name + "(text)")
  }
  return text
}

/**
 * Fixes specific to episode 0005.
 * Invoked by the function episode_specific_fixes()
 *
 * @param {string} text The text to fix
 * @return {string} The fixed text.
 */
function fix_0005(text) {
  text = text.replace(/Ba[zs] tutorials/gi, '<a href="https://www.youtube.com/user/BazTutorials">Baz Tutorials</a>')
  text = text.replace(/Highbury hi/gi, 'Hi Barry')
  text = text.replace(/member of the urn, /gi, '')
  return text
}

/**
 * Recovers capitalization of guest's names.
 *
 * If part of a guest's name happens to be a noun
 * it gets lower cased by the automatic transcription, e.g.:
 * Barry Moon becomes Barry moon.
 * This function replaces any matches with the name ignoring case
 * to their original spelling.
 *
 * @param {text} text The text to fix.
 * @return {string} The fixed text.
 */
function recoverGuestCapitalization(text){
  guests.forEach( (guest, idx) => {
    re = new RegExp(guest, "gi")
    text = text.replace(re, guest)
  })
  return text
}

/**
 * Returns formatted date.
 *
 * @param {date} d The date to format. If omitted: Today. ( E.g.
 *  formatDate(new Date('2013-10-14')) ) 
 * @return {string} The string representation of the date.
 */
function formatDate(d=new Date()) {
  return "January February March April May June July August September October November December"
    .split(' ')[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
}

