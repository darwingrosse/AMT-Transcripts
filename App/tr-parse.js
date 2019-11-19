#!/usr/bin/env node

// this class provides a method getName(), which on first invocation returns the full name,
// on subsequent invocations returns only the first name.
class Speaker {

  constructor(name) {
    this.full_name = name;
    this.first_name = name.split(/\s/).shift();
    this.first = true;
  }

  // always returns full name
  getFullName() {
    return this.full_name;
  }

  // on first invocation returns the full name,
  // on subsequent invocations returns only the first name.
  getName() {
    if (this.first) {
      this.first = false;
      return this.full_name;
    } else {
      return this.first_name;
    }
  }

}

// Usage:
// formatDate(new Date('2013-10-14')) // for a particular date
// formatDate() // for today
function formatDate(d=new Date()) {
  return "January February March April May June July August September October November December"
    .split(' ')[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
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

speakers = argv.speaker.map( (i) => new Speaker(i) )
guests = argv.speaker.slice(1)

var isErrored = false;
var fn = argv.json

var inFileName = '../JSON/' + fn;
var outFileName = '../HTML/' + fn;

var fileContent = fs.readFileSync(inFileName + '.json', 'utf-8');
var data = JSON.parse(fileContent);
var chunk, i;

var start_text =
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

var this_year = new Date().getFullYear();
var release_year = new Date(argv.released).getFullYear();

var end_text =
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
para = para + start_text;

for (var x=0; x<data.monologues.length; x++) {
  
  para = para + "<p>" + '\n' + "<b>" + speakers[data.monologues[x].speaker].getName() + ": </b>";
  chunk = data.monologues[x].elements;

  for (i=0; i<chunk.length; i++) {
    if (chunk[i].type == "text") {
      setColorStart(chunk[i].confidence);
      para = para + chunk[i].value;
      setColorEnd();
    } else if (chunk[i].type == "punct") {
      setColorStart(chunk[i].confidence);
      para = para + chunk[i].value;
      setColorEnd();
    } else if (chunk[i].type == "unknown") {
      setColorStart(0);
      para = para + "***" + chunk[i].value + "***";
      setColorEnd();
    } else {
      setColorStart(0);
      para = "[" + chunk[i].type + "]"
      setColorEnd();
    }
  }

  para = para + '\n' + "</p>" + '\n' + '\n'
}

// post-processing
console.log("post-processing...");
para = replaceAll(para, '__um__,', '');
para = replaceAll(para, '__um__', '');
para = replaceAll(para, '__uh__,', '');
para = replaceAll(para, '__uh__', '');

para = para + end_text;
fs.writeFileSync(outFileName + '.html', para);
console.log('complete');


// ----------
// functions
// ----------

function setColorStart(v) {
  if ((v < 0.5) && (!isErrored)) {
    // para = para + '<span style="color:red">';
    para = para + '__';
    isErrored = true;
  }
}

function setColorEnd() {
  if (isErrored) {
    // para = para + '</span>';
    para = para + '__';
    isErrored = false;
  }
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}
