var path = require('path');

var Promise = require('bluebird');
var nodegit = require('nodegit');
var prompt = require('prompt');
var chalk = require('chalk');
var expandTilde = require('expand-tilde');

var fs = require('../util/fs');
var logger = require('../util/logging').get('gitCredentials');


// Initialize prompt library
prompt.message = chalk.grey('prompt: ');
prompt.delimiter = '';


// TODO: provide customization of this
var SSH_DIR = expandTilde('~/.ssh');
var sshKeyInfo = null;


var asyncPrompt = function(schema) {
  prompt.start();
  return Promise.promisify(prompt.get)(schema);
};


module.exports = {
  loadSshKeyInfo: function() {
    sshKeyInfo = {
      publicPath: path.join(SSH_DIR, 'id_rsa.pub'),
      privatePath: path.join(SSH_DIR, 'id_rsa'),
      exists: false,
      isProtected: false
    };

    if (fs.existsSync(sshKeyInfo.privatePath)) {
      sshKeyInfo.exists = true;

      var contents = fs.readFileSync(sshKeyInfo.privatePath, 'utf8');
      var lines = contents.split('\n');
      sshKeyInfo.isProtected = /^Proc-Type:.*?ENCRYPTED/.test(lines[1]);
    }
  },

  callbacks: {
    certificateCheck: function() {
      // github will fail cert check on some OSX machines
      // this overrides that check
      return 1;
    },
    credentials: function(url, username) {
      logger.debug('Credential check', url, username);

      // Assume ssh
      if (username) {
        if (!sshKeyInfo) {
          module.exports.loadSshKeyInfo();
        }

        if (!sshKeyInfo.exists) {
          logger.warn('no ssh key available, deferring to ssh-agent');
          return nodegit.Cred.sshKeyFromAgent(username);
        }

        return Promise.resolve()
          .then(function() {
            if (!sshKeyInfo.isProtected) {
              return { password: '' };
            }

            var schema = {
              properties: {
                password: {
                  description: chalk.white('Password for "' + sshKeyInfo.privatePath + '":'),
                  hidden: true,
                  required: true
                  // default: 'anonymous'
                }
              }
            };

            return asyncPrompt(schema);
          })
          .then(function(res) {
            logger.debug('Fetching with ssh key:', sshKeyInfo.privatePath);
            return nodegit.Cred.sshKeyNew(username, sshKeyInfo.publicPath, sshKeyInfo.privatePath, res.password);
          });
      }

      // Assume https auth
      // Note: some git providers may always require a password... if that happens, make prompt's default not ugly as sin
      return Promise.resolve()
        .then(function() {
          var schema = {
            properties: {
              username: {
                description: chalk.white('Username for "' + url + '":'),
                required: true
                // default: 'anonymous'
              },
              password: {
                description: chalk.white('Password:'),
                hidden: true,
                required: true
                // default: 'anonymous'
              }
            }
          };

          return asyncPrompt(schema);
        })
        .then(function(res) {
          logger.debug('Got credentials for user', res.username, ', fetching...');
          return nodegit.Cred.userpassPlaintextNew(res.username, res.password);
        });
    }
  },

  getFetchOpts: function(opts) {
    return merge({
      callbacks: module.exports.callbacks
    }, opts);
  }
};
