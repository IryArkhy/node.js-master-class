// create and export config variables

const environments = {};

// Staging is a default environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsHashingSecret',
};

// Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoHashingSecret',
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
