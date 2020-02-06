// -------
// classes
// -------
const path = require('path');
const glob = require('glob');
const fs = require('fs');

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

class TranscriptionJsonToHtml {

  constructor (json, speakers, releaseDate, audio_file, audio_offset) {
    this.json = json;
    this.speakers = speakers.map( i => new Speaker(i) )
    this.guests = speakers.slice(1)
    this.releaseDate = releaseDate
    this.audio_file = audio_file

    if (audio_file && !fs.existsSync(audio_file)){
      throw audio_file + " does not exist.";
    }

    this.audio_offset = audio_offset;
    const FN = path.basename(json, '.json'); // gets rid of optional .json extension and optional directory
    this.episode = FN.replace(/\D/g, ''); // extract digits, e.g. episode005withxy.json -> 005
    this.inFileName = this.normalize_json_filename(FN);
    this.outFileName = this.normalize_html_filename(FN);
    this.chunkStartTimeToIdx = {};

    this.isErrored = false;
  }

  normalize_json_filename(stem) {
    return '../JSON/' + stem + '.json';
  }

  normalize_html_filename(stem) {
    return '../HTML/' + stem + (this.audio_file ? '_audio' : '') + '.html';
  }

  doit() {
    this.fileContent = fs.readFileSync(this.inFileName, 'utf-8');
    this.data = JSON.parse(this.fileContent);
    console.log("Parse complete, " + this.data.monologues.length + " entries.");

    this.append_html_start_text();
    this.collect_chunk_indices();
    this.episode_specific_json_fixes();
    this.render_conversation();

    console.log("post-processing...");

    this.para = recoverGuestCapitalization(this.para, this.guests);
    this.para = fix_products(this.para);
    this.episode_specific_html_fixes();


    this.append_html_end_text();
    fs.writeFileSync(this.outFileName, this.para);
    console.log('created ' + this.outFileName);
    console.log('complete');

  }

  render_conversation() {

    let unknown_speaker_no = 0
    let max_speaker = -1
    const ORIGINAL_SPEAKER_COUNT = this.speakers.length

    for (let x=0; x<this.data.monologues.length; x++) {

      const SPEAKER_IDX = this.data.monologues[x].speaker;
      max_speaker = SPEAKER_IDX > max_speaker ? SPEAKER_IDX : max_speaker
      if (SPEAKER_IDX >= this.speakers.length) {
        unknown_speaker_no += 1
        this.speakers[ this.speakers.length ] = new Speaker(`UNKNOWN_SPEAKER_${unknown_speaker_no.toString().padStart(2, "0")}`)
      }
      this.para += '<p>\n<b>' + this.speakers[SPEAKER_IDX].getName() + ": </b>" + (SPEAKER_IDX == 0 ? '<i>' : '');
      const CHUNK = this.data.monologues[x].elements;

      for (let i=0; i<CHUNK.length; i++) {
        this.para += this.handleChunk(CHUNK[i]);
      }

      this.para += (SPEAKER_IDX == 0 ? '</i>' : '') + '\n</p>\n\n';
    }

    if (unknown_speaker_no > 0) {
      console.log(`json contains more speakers (${unknown_speaker_no+ORIGINAL_SPEAKER_COUNT}) than were provided via -s (${ORIGINAL_SPEAKER_COUNT})`)
    }
    if (ORIGINAL_SPEAKER_COUNT > max_speaker + 1) {
      console.log(`WARNING: ${ORIGINAL_SPEAKER_COUNT- (max_speaker + 1) } surplus speakers were specified on the command line: ${(this.speakers.slice(max_speaker + 1)).map(s => s.full_name)} that did not occur in ${this.inFileName}`)
    }

  }

  /**
   * Collects indices to chunks with chunk.ts as the key.
   * We can implement a step in between to handle/delete/coalesce chunks
   * right within the json before rendering to HTML.
   * Already in this pass we get rid of um, uh.
   */
  collect_chunk_indices() {

    for (let x=0; x<this.data.monologues.length; x++) {
      let chunk = this.data.monologues[x].elements;
      let i = 0
      let j = 0
      let chunks_to_delete = []
      while ( i < chunk.length ) {
        let this_chunk = chunk[i]
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
          this.chunkStartTimeToIdx[ this_chunk.ts ] = [x, j++]
          i++
        }
      }
      chunks_to_delete = chunks_to_delete.reverse() // delete from the end, so indices remain valid
      for (i = 0; i < chunks_to_delete.length; ++i) {
        chunk.splice(chunks_to_delete[i], 1)
      }
    }
  }

  /**
   * Appends the html header text
   *
   */
  append_html_start_text() {

    const HTML_TITLE = this.episode + ' - ' + this.guests.join(", ") + (this.audio_file ? ' - with audio' : '')
    console.log("'" + HTML_TITLE + "'")

    const CUSTOM_CSS_PATH = '../HTML/css/j2h.css';

    const CUSTOM_CSS_PRESENT = glob.sync(CUSTOM_CSS_PATH).length
    const AUDIO_STYLE = CUSTOM_CSS_PRESENT ?
    `
      <link rel="stylesheet" type="text/css" href="${CUSTOM_CSS_PATH}">
    `
    :
    `
    <style>
      body {
        background-color : #f1fD9D
      }
      span[onclick] {
        background-color : #f6ffdf;
        cursor: pointer;
      }
    </style>
    `

    if (CUSTOM_CSS_PRESENT && this.audio_file) {
      console.log(`Using custom css: ${CUSTOM_CSS_PATH}`)
    } else {
      console.log(`Using default css`)
    }

    const HTML_STYLE = this.audio_file ? AUDIO_STYLE : ''

    const START_TEXT = `<!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
      <title>Transcription: Podcast ${HTML_TITLE}</title>

      <!-- Bootstrap -->
      <link href="css/bootstrap.min.css" rel="stylesheet">

      <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
      <!-- WARNING: Respond.js does not work if you view the page via file:// -->
      <!--[if lt IE 9]>
          <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
          <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->
      ${HTML_STYLE}
    </head>

    <body>
      <div class="container">
        <h2>Transcription: ${HTML_TITLE}</h2>
        <h3>Released: ${this.releaseDate}</h3>
    `
    this.para = START_TEXT;
  }

  /**
   * Appends the html end text.
   *
   */
  append_html_end_text() {

    const this_year = new Date().getFullYear();
    const release_year = new Date(this.releaseDate).getFullYear();

    let end_text =`\
    <p><i>Copyright ${release_year + (this_year != release_year ? ('-' + this_year) : '' )} by Darwin Grosse. All right reserved.</i></p></div>
    <!-- jQuery (necessary for the Bootstrap JavaScript plugins) -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
    <!-- Include all compiled plugins (below), or include individual files as needed -->
    <script src="js/bootstrap.min.js"></script>
    `

    if (this.audio_file) {
      end_text += `\
    <script>

      audio_thing = {}

      setAudioFile('${this.audio_file}')

      audio_thing.audioElement.addEventListener('loadeddata', () => {
        let duration = audio_thing.audioElement.duration;
        audio_thing.duration = duration;
        // The duration variable now holds the duration (in seconds) of the audio clip
      })

      function play(from_time) {
        from_time = parseFloat(from_time) + ${this.audio_offset}
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

      window.addEventListener('keydown', e => {
        if (e.code === "Space") {
          e.preventDefault();
          if (audio_thing.audioElement.paused) {
            audio_thing.audioElement.play()
          } else {
            audio_thing.audioElement.pause()
          }
        }
      })

    </script>
    `
    }

    end_text += `
    </body>
    </html>
    `;

    this.para += end_text;
  }

  /**
   * Handles the given chunk
   *
   * FIXME:
   * isErrored, setColorStart, setColorEnd, surround, handleChunk
   * really belong into their own module
   *
   * @param {chunk} chunk The chunk to turn into text.
   * @return {string} The resulting text.
   */
  handleChunk(chunk) {
    const dispatch = {
      "text" :
        chunk => this.surround(chunk,
          chunk => chunk.value
        ),
      "punct" :
        chunk => this.surround(chunk,
          chunk => chunk.value
        ),
      "unknown" :
        chunk => this.surround(chunk,
          chunk => "***" + chunk.value + "***",
          chunk => chunk.confidence = 0
        ),
    }

    if (chunk.type in dispatch) {
      return dispatch[chunk.type](chunk)
    } else {
      return chunk => this.surround(chunk,
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
  surround(chunk, func, prefunc) {
    if (prefunc) {
      prefunc(chunk)
    }
    return this.setColorStart(chunk) + func(chunk) + this.setColorEnd(chunk);
  }

  setColorStart(chunk) {
    const v = chunk.confidence
    let text = ''
    if (this.audio_file && chunk.type === 'text' && v >= 0.5) { // uncertain chunks will not be marked up for being playable
      text += '<span data-ts="' + chunk.ts + '" data-end_ts="' + chunk.end_ts +
              '" id="' + chunk.ts + '" title="' + chunk.ts + '" onclick="play(\'' +
              chunk.ts + '\')">';
    }
    if ((v < 0.5) && (!this.isErrored)) {
      text += '<span style="color:red" data-ts="' + chunk.ts +
              '" data-end_ts="' + chunk.end_ts + '" title="' +
              chunk.ts + '" id=c_"' + chunk.ts + '">';
      text += '__';
      this.isErrored = true;
    }
    return text
  }

  setColorEnd(chunk) {
    let text = ''
    if (this.isErrored) {
      text += '__';
      text += '</span>';
      this.isErrored = false;
    }
    const v = chunk.confidence
    if (this.audio_file && chunk.type === 'text' && v >= 0.5) { // uncertain chunks will not be marked up for being playable
      text += '</span>';
    }
    return text
  }

  /**
   * Looks for episode-specific json fixes and invokes them if found.
   *
   * To provide episode-specific json fixes add a function named
   * fix_json_EPISODE-NUMBER
   *
   */
  episode_specific_json_fixes() {
    let func_name = 'fix_json_' + this.episode
    if (eval("typeof " + func_name) === "function") {
      console.log('applying episode ' + this.episode + '-specific json fixes')
      eval(func_name + "(this)")
    }
  }

  /**
   * Looks for episode-specific html fixes and invokes them if found.
   *
   * @param {string} text The html text to fix
   * @param {int} episode The episode this fix is pertaining to
   * @return {string} The fixed html text.
   */
  episode_specific_html_fixes() {
    const func_name = 'fix_html_' + this.episode
    if (eval("typeof " + func_name) === "function") {
      console.log('applying episode ' + this.episode + '-specific html fixes')
      eval("this.para = " + func_name + "(this.para)")
    }
  }

  patch_json(startTime, func) {
    let monologue_chunks = this.chunkStartTimeToIdx[startTime]
    let chunk = this.data.monologues[monologue_chunks[0]].elements[monologue_chunks[1]]
    func(chunk)
  }

} // TranscriptionJsonToHtml

function fix_json_0005(json2html) {
  json2html.patch_json('367.74', chunk => chunk.confidence = 1)
  json2html.patch_json('561.54', chunk => chunk.confidence = 1)
  json2html.patch_json('1311.56', chunk => chunk.confidence = 1)
  json2html.patch_json('1480.08', chunk => chunk.confidence = 1)
  json2html.patch_json('1483.36', chunk => chunk.confidence = 1)
  json2html.patch_json('2179.68', chunk => chunk.value = 'looked')
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
    const re = spanifyRX(guest, true);
    text = text.replace(re, guest)
  })
  return text
}


/**
 * Replaces product names with corrections and adds links.
 *
 * @param {string} text The text to fix
 * @return {string} The fixed text
 */
function fix_products(text) {
  const JITTER = '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max/MSP/Jitter</a>';
  const JITTER_SHORT = '<a href="https://en.wikipedia.org/wiki/Max_(software)">Jitter</a>';
  const MAX = '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max/MSP</a>';
  const PD = '<a href="https://en.wikipedia.org/wiki/Pure_Data">PD</a>';
  const CYCLING74 = '<a href="https://en.wikipedia.org/wiki/Cycling_%2774">Cycling \'74</a>';
  const UNITY3D = '<a href="https://en.wikipedia.org/wiki/Unity_(game_engine)">Unity3d</a>';
  text = replace_span(text, '__Maximus PGA__ there', JITTER);
  text = replace_span(text, 'gender', JITTER_SHORT);
  text = replace_span(text, 'Maximus P', MAX, 7);
  text = replace_span(text, 'Maximize P', MAX);
  text = replace_span(text, 'maximum is P', MAX);
  text = replace_span(text, '__Macs__', MAX);
  text = replace_span(text, 'PD', PD);
  text = replace_span(text, 'cycling 74', CYCLING74);
  text = replace_span(text, 'unity three D', UNITY3D, 3);
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
  text = replace_span(text, 'Shortly', 'Short')
  text = replace_span(text, 'BAS, BAS Z BAS tutorials', 'Baz, <a href="https://www.youtube.com/user/BazTutorials">Baz Tutorials.</a>')
  text = replace_span(text, '__BAS__ tutorials', '<a href="https://www.youtube.com/user/BazTutorials">Baz Tutorials.</a>')
  text = replace_span(text, 'Ba[zs] tutorials', '<a href="https://www.youtube.com/user/BazTutorials">Baz Tutorials</a>')
  text = replace_span(text, 'Highbury hi', 'Hi Barry')
  text = replace_span(text, 'member of the urn', '')
  text = replace_span(text, 'I first ran into, well I won.t say I first ran into him', '')
  text = replace_span(text, 'on the, on the, on the, ', 'on the')
  text = replace_span(text, 'I was, I was', 'I was')
  text = replace_span(text, '__who__', 'who');
  text = replace_span(text, 'econ', '<a href="https://en.wikipedia.org/wiki/IRCAM">IRCAM</a>');
  text = replace_span(text, 'ice PW', '<a href="https://en.wikipedia.org/wiki/ISPW">ISPW</a>');
  text = replace_span(text, '__yeah__', '');
  text = replace_span(text, '__furs__', 'for');
  text = replace_span(text, '__corrode__', 'code');
  text = replace_span(text, '__will__', 'will');
  text = replace_span(text, '__till__', 'till it\'s');
  text = replace_span(text, 'It.s kind of', 'It\'s kind of curious.');
  text = replace_span(text, 'but I __don.t__ like to, I', 'but I\'d like to');
  text = replace_span(text, 'And we started when we started', 'And when we started');
  text = replace_span(text, 'all taker', '<a href="https://en.wikipedia.org/wiki/Autechre">Autechre</a>');
  text = replace_span(text, 'sort of walk prey codes scene', '<a href="https://en.wikipedia.org/wiki/Warp_(record_label)">Warp Records</a> scene');
  text = replace_span(text, 'You.re talking about __or__ we.ll take her', 'You know, talking about <a href="https://en.wikipedia.org/wiki/Autechre">Autechre</a>');
  text = replace_span(text, 'I.m doing __a__', 'I\m doing');
  text = replace_span(text, '__art__', 'art');
  text = replace_span(text, 'I.m a question', 'a question');
  text = replace_span(text, 'as having a pH D', 'having a PhD');
  text = replace_span(text, 'Hillary harp', '<a href="http://hilaryharp.com/">Hilary Harp</a> ', 2);
  text = replace_span(text, 'things that __their__ __death__ ', 'things. Our ');
  text = replace_span(text, 'got. Some', 'got some ');
  text = replace_span(text, 'as a, as a', 'as a ', 3);
  text = replace_span(text, 'the whole, how, along with', '');
  text = replace_span(text, 'on the, on the', 'on the');
  text = replace_span(text, 'it.s Barry Moon', 'it\'s Barry Moon,');
  text = replace_span(text, 'that he is', 'that he has');
  text = replace_span(text, 'electro acoustic', 'electroacoustic');
  text = replace_span(text, 'burying moon', 'Barry Moon');
  text = replace_span(text, 'yourself, what you.re', 'yourself,');
  text = replace_span(text, 'what I sort of', 'what I');
  text = replace_span(text, 'sort of failed', 'of failed');
  text = replace_span(text, 'a, a, a', 'a');
  text = replace_span(text, 'get a, get a', 'get a');
  text = replace_span(text, ' and sort of fall into as a, ', '. ');
  text = replace_span(text, 'that went ', '');
  text = replace_span(text, 'was in an', 'was an');
  text = replace_span(text, 'then, so, yeah, I mean, did, ', 'then ');
  text = replace_span(text, 'SUNY Buffalo', '<a href="https://en.wikipedia.org/wiki/University_at_Buffalo">SUNY Buffalo</a>');
  text = replace_span(text, 'which was, which I got that', 'which I got in');
  text = replace_span(text, 'awhile', 'a while', 2);
  text = replace_span(text, 'Brown university', '<a href="https://en.wikipedia.org/wiki/Brown_University">Brown University</a>');
  text = replace_span(text, 'Brown for', '<a href="https://en.wikipedia.org/wiki/Brown_University">Brown</a> for');
  text = replace_span(text, 'Todd Winkler', '<a href="https://vivo.brown.edu/display/twinkler">Todd Winkler</a>', 2);
  text = replace_span(text, 'for a while', 'for a while.', 2);
  text = replace_span(text, 'then, it.s, you know, England', 'then England');
  text = replace_span(text, 'bath baths by university', 'Bath, <a href="https://en.wikipedia.org/wiki/Bath_Spa_University">Bath Spa University</a>');
  text = replace_span(text, 'and then England', ', England');
  text = replace_span(text, 'then, yeah, came back to to', 'then came back to');
  text = replace_span(text, 'sort of instrumental', 'instrumental');
  text = replace_span(text, 'yeah, live, you know, live', 'live');
  text = replace_span(text, 'pick Kushan', 'percussion');
  text = replace_span(text, 'a, clarinet', 'a clarinet');
  text = replace_span(text, 'the CZ', 'Assisi.');
  text = replace_span(text, 'yeah, so doing the, of doing that side of things, the', 'on the');
  text = replace_span(text, 'I work with, at the moment ', 'At the moment I\'m ');
  text = replace_span(text, 'doing, instrumental', 'doing instrumental');
  text = replace_span(text, 'doing, public', 'doing public');
  text = replace_span(text, 'that.s, that.s', 'that\'s', 3);
  text = replace_span(text, 'kind of had', 'had');
  text = replace_span(text, 'when they, when they', 'when they');
  text = replace_span(text, 'clarinet festival', '<a href="https://www.accademiaitalianaclarinetto.com/the-festival/">clarinet festival</a>');
  text = replace_span(text, ' certainly the, computation ', ' certainly the computation ');
  text = replace_span(text, 'on a court lippy', 'with <a href="https://www.cortlippe.com/">Cort Lippe</a>');
  text = replace_span(text, 'that, that', 'that');
  text = replace_span(text, 'largest influence on the greatest', 'greatest');
  text = replace_span(text, 'over and from, from your comp', 'over from <a href="https://en.wikipedia.org/wiki/IRCAM">IRCAM</a>.');
  text = replace_span(text, 'be introduced', 'introduced');
  text = replace_span(text, 'max FTS', '<a href="https://en.wikipedia.org/wiki/Max_(software)">Max/FTS</a>');
  text = replace_span(text, 'so. __It__ was', 'so was');
  text = replace_span(text, 'any of the, the', 'any of the');
  text = replace_span(text, 'you are', 'you were');
  text = replace_span(text, 'to yes', 'to, yes.');
  text = replace_span(text, 'for those of you have just about everybody who was too old to know for __a__ bird', 'Most of you are probably too young to remember those.');
  text = replace_span(text, 'workstation', 'workstation.');
  text = replace_span(text, 'I, I was supposedly the system ', 'I was supposedly the system administrator ');
  text = replace_span(text, 'for the next, there.ll be, we.re running', 'for the <a href="https://en.wikipedia.org/wiki/NeXT_Computer">NeXT</a> computers that we were running');
  text = replace_span(text, 'next operating system', '<a href="https://en.wikipedia.org/wiki/NeXTSTEP">NeXT operating system</a>.');
  text = replace_span(text, 'about, some of, some of', 'about some of');
  text = replace_span(text, 'kind of talk', 'talk');
  text = replace_span(text, 'about, these', 'about these');
  text = replace_span(text, 'a blender', 'blender', 1);
  text = replace_span(text, 'blender', '<a href="https://en.wikipedia.org/wiki/Blender_(software)">Blender</a>', 3);
  text = replace_span(text, 'they.re not even, you know, in any way, you know, teaching and through __their__, they have no experience teaching as far as I know.', 'they don\'t even have any teaching experience, as far as I know.');
  text = replace_span(text, '__they__', 'to');
  text = replace_span(text, 'learn __to__, you can.t ', '');
  text = replace_span(text, 'and until', 'until');
  text = replace_span(text, 'birth', 'Bath.');
  text = replace_span(text, 'POTUS head', '<a href="https://en.wikipedia.org/wiki/Portishead_(band)">Portishead</a>');
  text = replace_span(text, 'massive attack', '<a href="https://en.wikipedia.org/wiki/Massive_Attack">Massive Attack</a>');
  text = replace_span(text, 'Minnesota', '');
  text = replace_span(text, '__she__, the sorts of thing, the ', 'the');
  text = replace_span(text, 'me to, for the, Arizona', 'me to the Arizona');
  text = replace_span(text, 'they, it.s', 'it\'s');
  text = replace_span(text, 'not, you know, sort of ', '');
  text = replace_span(text, 'for, I mean, it.s ', 'for. It\'s ');
  text = replace_span(text, 'Yeah. My.*maybe, maybe', 'I think maybe ');
  text = replace_span(text, 'Luke Dubois', '<a href="https://en.wikipedia.org/wiki/R._Luke_DuBois">Luke Dubois</a>');
  text = replace_span(text, 'dying at', 'doing that.');
  text = replace_span(text, 'to, use', 'to use', 3);
  text = replace_span(text, 'court Libby', '<a href="https://www.cortlippe.com/">Cort Lippe</a>');
  text = replace_span(text, '(__)?court(__)?', '<a href="https://www.cortlippe.com/">Cort</a>', 3);
  text = replace_span(text, 'on. You know what.*93', 'on. I mean \'92 or \'93');
  text = replace_span(text, 'TA work', '<a href="https://en.wikipedia.org/wiki/Teaching_assistant">TA work</a>');
  text = replace_span(text, 'tutorials, video tutorials', 'video tutorials');
  text = replace_span(text, 'I, you know, as, as a', 'As a');
  text = replace_span(text, 'yeah, I just didn.t, my', 'my');
  text = replace_span(text, 'learned, which are just, you know, there.s', 'learned, there\'s');
  text = replace_span(text, 'And you know, and', 'And');
  text = replace_span(text, ', you know, ', ' ');
  text = replace_span(text, 'I.d say I', 'I');

  return text
}

/**
 * Changes the text by replacing 'search' with 'replacement', in a text
 * that may be marked up with html span elements.
 *
 * @param {string} text The text to change
 * @param {string} search The pattern to search. Can contain regex syntax.
 * @param {string} replacement The replacement text.
 *
 * ATTENTION: commas are filtered out in the search term!
 * So when specifying a search term where commas are to be replaced/repositioned,
 * make sure that they are enclosed by words surrounding them, i.e. that the
 * commas are not at the boundary of the search term.
 */
function replace_span(text, search, replacement, expected_matches = 1) {
  const spanned_regex = spanifyRX(search)
  //text = text.replace(spanned_regex, replacement);
  let count = 0
  text = text.replace(spanned_regex, () => { count++; return replacement });
  if (count !== expected_matches) {
    let count_str = count.toString().padStart(4, ' ');
    console.log(`**** ${count_str} instead of expected ${expected_matches} matches for search "${search}"`)
  }
  return text
}

/**
 * surrounds each word in a blank separated string by optional html span element regex.
 * @param {string} text The text to process
 * @param {boolean} ignoreCase Whether to ignore case
 * @return {string}     The processed text
 */
function spanifyRX(text, ignoreCase = false) {

  /**
   * surrounds given text with regex for optional html span element regex.
   * @param {string} text The text to surround with optional span regex
   * @return {string}     The text surrounded with optional span regex
   */
  function spanify(text) {
    text = '(?:\\<span[^>]*?\\>)?'+ text + '(?:\\<\\/span\\>)?(?:,|\\.)?'; // add optional trailing comma or period
    return text
  }

  let arr = text.split(/\s+/)
  arr = arr.map(x => x.replace(/(?:,|\.)$/,'')) // remove trailing commas. They'll be re-added as optional in spanify.
  text = arr.map(spanify).join(' ')
  return new RegExp(text, 'g' + (ignoreCase ? 'i' : ''));

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
// exports for testing purposes
module.exports = {
  formatDate : formatDate,
  Speaker : Speaker,
  recoverGuestCapitalization : recoverGuestCapitalization,
  fix_products : fix_products,
  TranscriptionJsonToHtml : TranscriptionJsonToHtml,
}
