# rasa-nlu-trainer
This is a tool to edit your training examples for [rasa NLU](https://github.com/rasahq/rasa_nlu)


Use the [online version](https://rasahq.github.io/rasa-nlu-trainer/) or [install with npm](#installation)

## installation

`$ npm i -g rasa-nlu-trainer` (you'll need [nodejs and npm](https://nodejs.org/) for this)

## launch
`$ rasa-nlu-trainer` in your working directory

this will open the editor in your browser

#### options
- `--source -s` path to the training file (by default it will be searched recursively in the current directory if no trainer_conf.json file is detected)
- `--port -p` the web app will run here (randomly selected by default)

### use the pending strings import
Create a **trainer_conf.json** in your Rasa installation folder and launch the trainer from that folder:
**trainer_conf.json**
```
{
  "source": "data/botshopper/botshopper.json", // the training file path
  "pending_file": "data/botshopper/botshopper_pending.json", // the file in which Rasa store the pending strings
  "threshold": 0.7 // the confidence limit, under that limit the string will be saved
}
```

## development

- git clone this repo
- `$ npm install`
- `$ npm start`

#### using the development build locally

- `$ npm run build`
- `$ npm link`

from here, the `$ rasa-nlu-trainer` command will start the development version

run `$ npm run build` again to update the build

run `$ npm unlink && npm i -g rasa-nlu-trainer` to use the npm version again


This project was bootstrapped with [Create React App](./CRA_README.md).
