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


/**
 * returns the html header text
 *
 * @param {string} episode The episode for which to generate the header, e.g. '0005'
 * @param {array[string]} guests The array of names of the guests in this episodes
 * @param {Object} argv The argv passed
 * @return {string} The html start text
 */
function make_html_start_text(episode, guests, argv) {

  const html_title = episode + ' - ' + guests.join(", ") + (argv.audio_file ? ' - with audio ' : '')

  const start_text = `<!DOCTYPE html>
  <html lang="en">

  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
    <title>Transcription: Podcast ${html_title}</title>

    <!-- Bootstrap -->
    <link href="css/bootstrap.min.css" rel="stylesheet">

    <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js does not work if you view the page via file:// -->
    <!--[if lt IE 9]>
        <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
        <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
      <![endif]-->
  </head>

  <body>
    <div class="container">
      <h2>Transcription: ${html_title}</h2>
      <h3>Released: ${argv.released}</h3>
  `
  return start_text
}

/**
 * returns the html end text
 *
 * @param {Object} argv The argv passed
 * @return {string} The html end text
 */
function make_html_end_text(argv) {

  const this_year = new Date().getFullYear();
  const release_year = new Date(argv.released).getFullYear();

  var end_text =`\
  <p><i>Copyright ${release_year + (this_year != release_year ? ('-' + this_year) : '' )} by Darwin Grosse. All right reserved.</i></p></div>
  <!-- jQuery (necessary for the Bootstrap JavaScript plugins) -->
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
  <!-- Include all compiled plugins (below), or include individual files as needed -->
  <script src="js/bootstrap.min.js"></script>
  `

  if (argv.audio_file) {
    end_text += `\
  <script>

    audio_thing = {}

    setAudioFile('${argv.audio_file}')

    audio_thing.audioElement.addEventListener('loadeddata', () => {
      let duration = audio_thing.audioElement.duration;
      audio_thing.duration = duration;
      // The duration variable now holds the duration (in seconds) of the audio clip
    })

    function play(from_time) {
      from_time = parseFloat(from_time) + ${argv.audio_offset}
      if (audio_thing.audioElement.paused) {
        audio_thing.audioElement.currentTime = from_time
        audio_thing.audioElement.play()
      } else {
        audio_thing.audioElement.pause()
        audio_thing.audioElement.currentTime = from_time
      }
    }


    function setAudioFile(path){
      audio_thing.audioElement = new Audio(path);
    }
  </script>
  `
  }

  end_text += `
  </body>
  </html>
  `;

  return end_text;
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
 * @param {array of strings} guests The array of guests.
 * @return {string} The fixed text.
 */
function recoverGuestCapitalization(text, guests){
  guests.forEach( (guest, idx) => {
    re = new RegExp(guest, "gi")
    text = text.replace(re, guest)
  })
  return text
}

// FIXME:
// isErrored, setColorStart, setColorEnd, surround, handleChunk
// really belong into their own module
//
/**
 * Handles the given chunk
 *
 * @param {chunk} chunk The chunk to turn into text.
 * @return {string} The resulting text.
 */
function handleChunk(argv, chunk) {
  dispatch = {
    "text" : 
      (argv, chunk) => surround(argv, chunk,
        (argv, chunk) => chunk.value
      ),
    "punct" : 
      (argv, chunk) => surround(argv, chunk,
        (argv, chunk) => chunk.value
      ),
    "unknown" : 
      (argv, chunk) => surround(argv, chunk,
        (argv, chunk) => "***" + chunk.value + "***",
        (argv, chunk) => chunk.confidence = 0
      ),
  }

  if (chunk.type in dispatch) {
    return dispatch[chunk.type](argv, chunk)
  } else {
    return chunk => surround(argv, chunk,
      chunk => "[" + chunk.type + "]",
      chunk => chunk.confidence = 0
    )
  }
}

/**
 * surrounds the given chunk with span depending on confidence of transcript
 *
 * @param {Object} argv The argv
 * @param {chunk} chunk The chunk to surround
 * @param {function} func The function to process the chunk's text
 * @param {function} prefunc The optional function to preprocess the chunk
 * @return {string} The chunk rendered as text
 */
function surround(argv, chunk, func, prefunc) {
  if (prefunc) {
    prefunc(argv, chunk)
  }
  return setColorStart(argv, chunk) + func(argv, chunk) + setColorEnd(argv, chunk);
}

var isErrored = false;

function setColorStart(argv, chunk) {
  const v = chunk.confidence
  let text = ''
  if (argv.audio_file && chunk.type === 'text' && v >= 0.5) { // uncertain chunks will not be marked up for being playable
    text += '<span data-ts="' + chunk.ts + '" data-end_ts="' + chunk.end_ts + 
            '" id="' + chunk.ts + '" title="' + chunk.ts + '" onclick="play(\'' +
            chunk.ts + '\')">';
  }
  if ((v < 0.5) && (!isErrored)) {
    text += '<span style="color:red" data-ts="' + chunk.ts +
            '" data-end_ts="' + chunk.end_ts + '" title="' +
            chunk.ts + '" id=c_"' + chunk.ts + '">';
    text += '__';
    isErrored = true;
  }
  return text
}

function setColorEnd(argv, chunk) {
  let text = ''
  if (isErrored) {
    text += '__';
    text += '</span>';
    isErrored = false;
  }
  const v = chunk.confidence
  if (argv.audio_file && chunk.type === 'text' && v >= 0.5) { // uncertain chunks will not be marked up for being playable
    text += '</span>';
  }
  return text
}

/**
 * Replaces product names with corrections and adds links.
 *
 * @param {string} text The text to fix
 * @return {string} The fixed text
 */
function fix_products(text) {
  const MAX = '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max/MSP</a>';
  const PD = '<a href="https://en.wikipedia.org/wiki/Pure_Data">PD</a>';
  const CYCLING74 = '<a href="https://en.wikipedia.org/wiki/Cycling_%2774">Cycling \'74</a>';
  const UNITY3D = '<a href="https://en.wikipedia.org/wiki/Unity_(game_engine)">Unity3d</a>';
  text = text.replace(/(?:maximus|maximize) P/i, MAX);
  text = text.replace(/maximum is P/i, MAX);
  text = text.replace(/__Macs__/, MAX);
  text = text.replace(/PD/, PD);
  text = text.replace(/cycling 74/i, CYCLING74);
  text = text.replace(/unity three D/i, UNITY3D);
  return text
}

/**
 * Fixes specific to episode 0005.
 * Invoked by the function episode_specific_html_fixes()
 *
 * @param {string} text The text to fix
 * @return {string} The fixed text.
 */
function fix_html_0005(text) {
  const JITTER = '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max/MSP/Jitter</a>';
  text = text.replace(/\<span[^>]*?\>BAS\<\/span\>, \<span[^>]*?\>BAS Z BAS\<\/span\> \<span[^>]*?\>tutorials\<\/span\>/gi, 'Baz, <a href="https://www.youtube.com/user/BazTutorials">Baz Tutorials</a>')
  text = text.replace(/Ba[zs] tutorials/gi, '<a href="https://www.youtube.com/user/BazTutorials">Baz Tutorials</a>')
  text = text.replace(/Highbury hi/gi, 'Hi Barry')
  text = text.replace(/member of the urn, /gi, '')
  text = text.replace(/Shortly/, 'Short')
  text = text.replace(/I first ran into, well I won't say I first ran into him, /, '')
  text = text.replace(/(on the, )+/, 'on the')
  text = text.replace(/I was, I was/, 'I was')
  text = text.replace(/\<span[^>]*?\>__who__\<\/span\>/g, 'who');
  text = text.replace(/econ/g, 'IRCAM');
  text = text.replace(spanifyRX('ice PW'), 'ISPW');
  text = text.replace(spanifyRX('__yeah__'), '');
  text = text.replace(spanifyRX('__furs__'), 'for');
  text = text.replace(/So I like, yeah. /g, '');
  text = text.replace(/\<span[^>]*?\>__Maximus PGA__\<\/span\> there/g, JITTER);
  text = text.replace(spanifyRX('__corrode__'), 'code');
  text = text.replace(spanifyRX('__will__'), 'will');
  text = text.replace(spanifyRX('__till__'), 'till it\'s');
  text = text.replace(spanifyRX('It\'s kind of'), 'It\'s kind of curious.');
  text = text.replace(spanifyRX('but I __don.t__ like to, I'), 'but I\'d like to'); // FIXME
  text = text.replace(spanifyRX('And we started when we started'), 'And when we started');
  text = text.replace(spanifyRX('all taker'), '<a href="https://en.wikipedia.org/wiki/Autechre">Autechre</a>');
  text = text.replace(spanifyRX('sort of walk prey codes scene'), '<a href="https://en.wikipedia.org/wiki/Warp_(record_label)">Warp Records</a> scene');
  text = text.replace(spanifyRX('You.re talking about __or__ we.ll take her'), 'You know, talking about <a href="https://en.wikipedia.org/wiki/Autechre">Autechre</a>');
  return text
}

/**
 * Looks for episode-specific html fixes and invokes them if found.
 *
 * @param {string} text The html text to fix
 * @param {int} episode The episode this fix is pertaining to
 * @return {string} The fixed html text.
 */
function episode_specific_html_fixes(text, episode) {
  func_name = 'fix_html_' + episode
  if (eval("typeof " + func_name) === "function") {
    console.log('applying episode ' + episode + '-specific html fixes')
    eval("text = " + func_name + "(text)")
  }
  return text
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

/**
 * surrounds each word in a blank separated string by optional html span element regex.
 * @param {string} text The text to process
 * @return {string}     The processed text 
 */
function spanifyRX(text) {
  var arr = text.split(/\s+/)
  var text = arr.map(spanify).join(' ')
  return new RegExp(text, 'g');

}

/**
 * surrounds given text with regex for optional html span element regex.
 * @param {string} text The text to surround with optional span regex
 * @return {string}     The text surrounded with optional span regex
 */
function spanify(text) {
  text = '(?:\\<span[^>]*?\\>)?'+ text + '(?:\\<\\/span\\>)?';
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
module.exports = {
  formatDate : formatDate,
  Speaker : Speaker,
  make_html_start_text : make_html_start_text,
  make_html_end_text : make_html_end_text,
  handleChunk : handleChunk,
  recoverGuestCapitalization : recoverGuestCapitalization,
  fix_products : fix_products,
  episode_specific_html_fixes : episode_specific_html_fixes,
//  fix_html_0005 : fix_html_0005,
}
