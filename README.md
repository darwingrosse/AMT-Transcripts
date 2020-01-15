# AMT-Transcripts
The Transcription project for the Art + Music + Technology podcast

Want to read the transcriptions? Give this a try:

[http://darwingrosse.com/AMT/transcriptions.html](http://darwingrosse.com/AMT/transcriptions.html))

All files are copyright 2019 by Darwin Grosse. All right reserved.

# AMT-Transcripts Transcription App

Transcriptions for the AMT Podcast are completed using the [https://rev.ai](https://rev.ai) service, which produces a JSON file with timestamp, punctuation, spacing and timing for every word in the transcribed document. But like all auto-transcribing tools, it misses a lot of stuff. For example, MIDI is often transcribed as "mini", or "Mitty" or even "Mindy". So it still have to be cleaned up manually.

The tr-parse application runs through the JSON document, ID's poorly transcribed words, labels the speaker, formats things into manageable HTML paragraphs, and installs some boilerplate around the HTML. It also, optionally, can create a document that provides direct access to the audio file for verification of the words (which is proving to be a great timesaver).

Huge thanks to Bernhard Wagner, who took a minimal Node.js program and is turning it into a powerhouse!

## Getting Started

These instructions will get you a copy of the project up on your local machine for cleaning up automatic transcriptions.

### Prerequisites

```bash
git clone https://github.com/darwingrosse/AMT-Transcripts.git
cd AMT-Transcripts/App
npm install
```

## Invoking the program
```bash
cd AMT-Transcripts/App
./tr-parse.js --help
generate plain html from json, filtering out cruft

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
  --audio-offset -o <audio-offset>  only valid and required for 'audio' command. Offset when speech
                                    starts in seconds (float, e.g. "-o 6.1").
  --audio-file -a <audio-file>      only valid and optional for 'audio' command.
                                    If not provided, the respective audio file
                                    is searched for in ../AUDIO according to
                                    episode number retrieved from json file name.


```

To generate an HTML file with the ability to play the audio podcast:

```bash
./tr-parse.js audio transcript-0005.json -s Darwin -s 'Barry Moon' -r 'November 10, 2013' -a path_to_podcast_audio/Podcast_005_BMoon.mp3 -o 6.1
```
* `audio`: This invokes the `audio` subcommand
* `transcript-0005.json`: The name of the json source file.
* `-s`: (repeated) speakers in order of their appearance (usually two).
* `-r`: release date of the podcast
* `-a`: path to the audio file of the podcast
* `-o`: offset where the spoken word part begins in seconds

**Note**: The audio play/stop interface is minimal: Clicking on a word anywhere starts playing the podcast from that point on. But clicking also toggles between playing and pausing. You'll get the hang of it. You can also toggle play/pause by pressing the space bar. The audio files of the podcast are available [here](http://artmusictech.libsyn.com/). The background of the rendered html file is yellowish when it is connected to the audio podcast. The text with lighter background is clickable and the podcast will be played from there. Also, the cursor changes to a hand when hovering above a word from where the podcast can be started.

**Note**: the `audio` subcommand and its options `-a` and `-o` are to be used
only while fixing the transcriptions. When done with fixing, the HTML should
be generated using the `plain` command devoid of the two audio options -a, -o,
e.g.:

```bash
./tr-parse.js plain transcript-0005.json -s Darwin -s 'Barry Moon' -r 'November 10, 2013'
```

The generated html file will have the same stem as the provided json file but with the
`.html` extension and it will be stored in the `HTML` directory. E.g.
`HTML/transcript-0005.html`
If the `audio` subcommand is used, the generated `html` file will have the same
name with `_audio` appended before the extension, e.g.
`HTML/transcript-0005_audio.html`
The generated `HTML/transcript-0005_audio.html` has a default style to facilitate
distinguishing it from the plain `html`generated when using the `plain`
subcommand. The `audio` default style can be overridden by providing a `css` file
named `../HTML/j2h.css`. There's an example file `../HTML/j2h_example.css`.

**Note**: If no audio file is passed via the `-a` option, the `audio`
subcommand will look for an audio file in the folder `../AUDIO` based on the
episode number, e.g.
```bash
./tr-parse.js audio transcript-0005.json -s Darwin -s 'Barry Moon' -r 'November 10, 2013' -o 6.1
```
will look for an mp3 file in `../AUDIO/` that has `0005` or `005` in its file name. E.g. for episode
`0005` `Podcast_005_BMoon.mp3` will be found if present in the `../AUDIO/` directory. You need to
populate `../AUDIO/` yourself from the  [art + music + technology podcast](http://artmusictech.libsyn.com).

## Repo Contents

- `/App` - Contains the conversation application (written in Node.js) used for a transcription aid.
- `/HTML` - Contains the transcribed and completed HTML for the podcast episodes.
- `/JSON` - Contains the raw JSON files created by the [https://rev.ai](https://rev.ai) conversion system
- `/AUDIO` - Container for downloaded episodes from the [art + music + technology podcast](http://artmusictech.libsyn.com). You need to download them yourself.

## Run Tests

npm test

### Coding Style Tests

TBD

## Built With

* [docopt](https://github.com/stuartcarnie/docopt.coffee) - For command line options
* [glob](https://github.com/isaacs/node-glob#readme) - For command line options
* [jest](https://jestjs.io/) - For testing
* [shellwords](https://github.com/jimmycuadra/shellwords) - For testing

## Contributing

TBD

## Versioning

TBD

## Authors

* [Darwin Grosse](http://www.darwingrosse.com/) - initiator and main author

* [Bernhard Wagner](http://bernhardwagner.net) - contributions to code and transcriptions

## License

All files are copyright 2019 by Darwin Grosse. All right reserved.

## Acknowledgments

* Billie Thompson for the [README template](https://gist.github.com/PurpleBooth).
