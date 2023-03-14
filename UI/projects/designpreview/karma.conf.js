// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('karma-trx-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reports: ['html', 'lcovonly', 'text-summary'],
      fixWebpackSourcePaths: true,
      combineBrowserReports: true,
      skipFilesWithNoCoverage: true,
      thresholds: {
        emitWarning: true, // set to `true` to not fail the test command when thresholds are not met
        // thresholds for all files
        global: {
          statements: 80,
          lines: 80,
          branches: 80,
          functions: 80
        },
        // thresholds per file
        each: {
          statements: 80,
          lines: 80,
          branches: 80,
          functions: 80,
          overrides: {
            'baz/component/**/*.js': {
              statements: 98
            }
          }
        }
      },
      verbose: true
    },
    reporters: ['progress', 'kjhtml', 'trx'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadless'],
    trxReporter: { outputFile: 'test-results.trx', shortTestName: true },
    singleRun: true
  });
};
