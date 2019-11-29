# AMT-Transcripts
The Transcription project for the Art + Music + Technology podcast

Want to read the transcriptions? Give this a try:

[http://darwingrosse.com/AMT/transcriptions.html](http://darwingrosse.com/AMT/transcriptions.html))

All files are copyright 2019 by Darwin Grosse. All right reserved.

## Getting Started

These instructions will get you a copy of the project up on your local machine for cleaning up automatic transcriptions.

### Prerequisites

```bash
git clone https://github.com/darwingrosse/AMT-Transcripts.git
cd AMT-Transcripts
npm install
```

## Invoking the program
```bash
cd AMT-Transcripts/App
./tr-parse.js --help
  --help              Show help                                        [boolean]
  --speaker, -s       speaker      [array] [required] [default: "Darwin Grosse"]
  --released, -r      release date                [default: "November 25, 2019"]
  --audio_file, -a    audio file
  --audio_offset, -o  audio file offset when speech starts in seconds [float]
```

To generate an HTML file with the ability to play the audio podcast:

```bash
./tr-parse.js transcript-0005.json -s Darwin 'Barry Moon' -r November 10, 2013 -a path_to_podcast_audio/Podcast_005_BMoon.mp3 -o 6.1
```
* `transcript-0005.json`: The name of the json source file.
* `-s`: an array of speakers in order of their appearance (usually two).
* `-r`: release date of the podcast
* `-a`: path to the audio file of the podcast
* `-o`: offset where the spoken word part begins in seconds

**Note**: The audio play/stop interface is minimal: Clicking on a word anywhere starts playing the podcast from that point on. But clicking also toggles between playing and pausing. You'll get the hang of it. You can also toggle play/pause by pressing the space bar. The audio files of the podcast are available [here](http://artmusictech.libsyn.com/). The rendered file is yellowish when it is connected to the audio podcast. The text with lighter background is clickable and the podcast will be played from there. Also the cursor changes to a hand when hovering above a word from where the podcast can be started.

**Note**: options `-a` and `-o` are to be used only while fixing the transcriptions.
When done with fixing, the HTML should be generated without tose two options,
e.g.:

```bash
./tr-parse.js transcript-0005.json -s Darwin 'Barry Moon' -r November 10, 2013
```

The generated html file will have the same stem as the provided json file but with the
.html extension and it will be stored in the HTML directory. E.g. 
`HTML/transcript-0005.html`
If the `-a` option is passed, the generated html file will have the same name with \_audio
appended before the extension, e.g. `HTML/transcript-0005\_audio.html`

## Running the Tests

npm test

### Coding Style Tests

TBD

## Built With

* [yargs](https://github.com/yargs/yargs) - For command line options
* [jest](https://jestjs.io/) - For testing

## Contributing

TBD

## Versioning

TBD

## Authors

* [Darwin Grosse](http://www.darwingrosse.com/) - initiator and main author

* [Bernhard Wagner](http://bernhardwagner.net) - contributions to code and transcriptions

## License All files are copyright 2019 by Darwin Grosse. All right reserved.

## Acknowledgments

* Billie Thompson for the [README template](https://gist.github.com/PurpleBooth).
