#!/usr/bin/env node

/* eslint-disable no-console */
const configFile = './config/config.js';

const __ = require('lodash');
const fs = require('fs');
const inquirer = require('inquirer');
const validate = require('./validate');
const baseConfig = require('../config/default-config');
const config = require('../config/config');
const modifyFiles = require('./utils');

const conf = __.merge(baseConfig, config);

const modes = [
  'Stand-alone Service',
  'Embedded service',
  'AWS Lambda Function'
];

const questions = [];

function validateInt(val) {
  return validate(val, 'int');
}

function setupQuestions() {
  questions.push({
    type: 'list',
    name: 'mode',
    default: modes,
    choices: modes,
    message: 'Select the service mode:',
  }, {
    type: 'input',
    name: 'port',
    default: conf.server.port,
    message: 'Server port to listen for HTTP requests:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode !== modes[2]);
    }
  }, {
    type: 'input',
    name: 'shutdownTime',
    default: conf.server.shutdownTime,
    message: 'Graceful server shutdown period in milliseconds:',
    validate: validateInt
  }, {
    type: 'input',
    name: 'timeout',
    default: conf.server.timeout,
    message: 'Request timeout period in seconds:',
    validate: validateInt
  }, {
    type: 'confirm',
    name: 'sslEnabled',
    default: conf.server.sslEnabled,
    message: 'Enable SSL?',
    when: (answers) => {
      return (answers.mode !== modes[2]);
    }
  }, {
    type: 'input',
    name: 'sslPort',
    default: conf.server.sslPort,
    message: 'Server port to listen for HTTP requests:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode !== modes[2] && answers.sslEnabled);
    }
  }, {
    type: 'input',
    name: 'sslKey',
    default: conf.server.sslKey,
    message: 'Full path to SSL Cert (.key) file:',
    when: (answers) => {
      return (answers.mode !== modes[2] && answers.sslEnabled);
    }
  }, {
    type: 'input',
    name: 'sslCert',
    default: conf.server.sslCert,
    message: 'Full path to SSL Cert (.pem/.crt) file:',
    when: (answers) => {
      return (answers.mode !== modes[2] && answers.sslEnabled);
    }
  }, {
    type: 'input',
    name: 'logDir',
    default: conf.logging.logDir,
    message: 'Full or relative path (from service base) to the log folder:',
    when: (answers) => {
      return (answers.mode === modes[0]);
    }
  }, {
    type: 'confirm',
    name: 'logJson',
    default: conf.logging.options.json,
    message: 'JSON logging?',
    when: (answers) => {
      return (answers.mode === modes[0]);
    }
  }, {
    type: 'input',
    name: 'logMaxSize',
    default: conf.logging.options.maxsize,
    message: 'Max log file size in bytes:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode === modes[0]);
    }
  }, {
    type: 'input',
    name: 'logMaxFiles',
    default: conf.logging.options.maxFiles,
    message: 'Max number of rotated log files:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode === modes[0]);
    }
  }, {
    type: 'list',
    name: 'logLevel',
    choices: ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
    default: conf.logging.options.level,
    message: 'Select lowest logging level:',
    when: (answers) => {
      return (answers.mode === modes[0]);
    }
  }, {
    type: 'confirm',
    name: 'logstashLogging',
    default: conf.logging.logstashLogging,
    message: 'Enable LogStash logging for service events?',
    when: (answers) => {
      return (answers.mode === modes[0]);
    }
  }, {
    type: 'input',
    name: 'logstashLoggingHost',
    default: conf.logstash.logging.host,
    message: 'Enter the LogStash IP or Hostname for service events:',
    when: (answers) => {
      return (answers.mode === modes[0] && answers.logstashLogging);
    }
  }, {
    type: 'input',
    name: 'logstashLoggingPort',
    default: conf.logstash.logging.port,
    message: 'Enter the LogStash UDP port for service events:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode === modes[0] && answers.logstashLogging);
    }
  }, {
    type: 'input',
    name: 'logstashLoggingAppName',
    default: conf.logstash.logging.appName,
    message: 'Enter the unqiue App Name to use for LogStash service events:',
    when: (answers) => {
      return (answers.mode === modes[0] && answers.logstashLogging);
    }
  }, {
    type: 'input',
    name: 'logstashRelayHost',
    default: conf.logstash.relay.host,
    message: 'Enter the LogStash IP or Hostname for relay events:'
  }, {
    type: 'input',
    name: 'logstashRelayPort',
    default: conf.logstash.relay.port,
    message: 'Enter the LogStash UDP port for relay events:',
    validate: validateInt
  }, {
    type: 'input',
    name: 'logstashRelayAppName',
    default: conf.logstash.relay.appName,
    message: 'Enter the unqiue App Name to use for LogStash relay events:'
  });
}

function mapAnswers(answers) {
  if (answers.port) { conf.server.port = answers.port; }
  conf.server.shutdownTime = answers.shutdownTime;
  conf.server.timeout = answers.timeout;
  if (answers.sslEnabled) { conf.server.sslEnabled = answers.sslEnabled; }
  if (answers.sslPort) { conf.server.sslPort = answers.sslPort; }
  if (answers.sslKey) { conf.server.sslKey = answers.sslKey; }
  if (answers.sslCert) { conf.server.sslCert = answers.sslCert; }
  if (answers.logDir) { conf.logging.logDir = answers.logDir; }
  if (answers.logJson) { conf.logging.options.json = answers.logJson; }
  if (answers.logMaxSize) { conf.logging.options.maxsize = answers.logMaxSize; }
  if (answers.logMaxFiles) { conf.logging.options.maxFiles = answers.logMaxFiles; }
  if (answers.logLevel) { conf.logging.options.level = answers.logLevel; }
  if (answers.logstashLogging) { conf.logging.logstashLogging = answers.logstashLogging; }
  if (answers.logstashLoggingHost) { conf.logstash.logging.host = answers.logstashLoggingHost; }
  if (answers.logstashLoggingPort) { conf.logstash.logging.port = answers.logstashLoggingPort; }
  if (answers.logstashLoggingAppName) { conf.logstash.logging.appName = answers.logstashLoggingAppName; }
  conf.logstash.relay.host = answers.logstashRelayHost;
  conf.logstash.relay.port = answers.logstashRelayPort;
  conf.logstash.relay.appName = answers.logstashRelayAppName;
}

function doConfig() {
  setupQuestions();
  inquirer.prompt(questions)
    .then((answers) => {
      mapAnswers(answers);
      fs.writeFileSync(configFile, `module.exports = ${JSON.stringify(conf, null, 2)};`);
      if (answers.mode === 'AWS Lambda Function') {
        // Replace "main": "index.js" with "main": "lambda.js"
        modifyFiles(
          ['./package.json'],
          [
            {
              regexp: /"main": "index.js",/,
              replacement: '"main": "lambda.js",'
            }
          ]
        );
      } else {
        // replace "main": "lambda.js" with "main": "index.js"
        modifyFiles(
          ['./package.json'],
          [
            {
              regexp: /"main": "lambda.js",/,
              replacement: '"main": "index.js",'
            }
          ]
        );
      }
    })
    .catch((err) => {
      console.error(err.stack || err);
    });
}


inquirer.prompt([
  {
    type: 'confirm',
    name: 'ok',
    default: false,
    message: 'This option will overwrite your existing configuration. Are you sure?'
  }
])
  .then((answers) => {
    if (answers.ok) {
      doConfig();
    } else {
      console.log('Operation aborted');
    }
  })
  .catch((err) => {
    console.error(err.stack || err);
  });
