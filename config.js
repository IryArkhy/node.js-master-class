// create and export config variables

const environments = {};

// Staging is a default environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsHashingSecret',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: '',
  },
};

// Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoHashingSecret',
  maxChecks: 5,
  twilio: {
    accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006',
  },
};

// Determine which env was passed as a command line argument

const currentEnv = process.env.NODE_ENV
  ? process.env.NODE_ENV.toLowerCase()
  : '';

// Check that the current environment is one of the envs available above, if not - default to 'staging

const environmentToExport = environments[currentEnv]
  ? environments[currentEnv]
  : environments.staging;

module.exports = environmentToExport;
