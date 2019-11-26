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

To generate an HTML file with the ability to play the audio file 

```bash
./tr-parse.js transcript-0005.json -s Darwin 'Barry Moon' -r November 10, 2013 -a path_to_podcast_audio/Podcast_005_BMoon.mp3 -o 6.1
```
* transcript-0005.json: The name of the json source file.
* -s: an array of speakers in order of their appearance (usually 2).
* -r: release date of the podcast
* -a: path to the audio file of the podcast.
* -o: offset where the spoken word part begins in seconds

**Note**: options -a and -o are to be used only while fixing the transcriptions.
When done with fixing, the HTML should be generated without tose two options,
e.g.:

```bash
./tr-parse.js transcript-0005.json -s Darwin 'Barry Moon' -r November 10, 2013
```

The generated html file will have the same stem as the provided json file but with the
.html extension and it will be stored in the HTML directory. E.g. 
`HTML/transcript-0005.html`
If the -a option is passed, the generated audio file will have the same name with \_audio
appended before the extension, e.g. HTML/transcript-0005\_audio.html

## Running the Tests

TBD

### Coding Style Tests

TBD

## Built With

* [yargs](https://github.com/yargs/yargs) - For command line options

## Contributing

TBD

## Versioning

TBD

## Authors

* Darwin Grosse - initiator and main author

* Bernhard Wagner - contributions to code and transcriptions

## License All files are copyright 2019 by Darwin Grosse. All right reserved.

## Acknowledgments

* Billie Thompson for the [README template](https://gist.github.com/PurpleBooth).
