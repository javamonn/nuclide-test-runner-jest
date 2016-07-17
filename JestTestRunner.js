'use babel';

/* @flow */

/*
TODO:
if current file is a jest test, pass it as param
send each test result
send close event
*/

const spawn = require('child_process').spawn;
const path = require('path');
const xatom = require('atom'); // atom is already globally defined
const Emitter = xatom.Emitter;


const PASSED  = 1;
const FAILED  = 2;
const SKIPPED = 3;
const FATAL   = 4;
const TIMEOUT = 5;

function statusNumFromString(s) {
  if (s === 'passed') {  return PASSED;  }
  if (s === 'failed') {  return FAILED;  }
  if (s === 'skipped') { return SKIPPED; }
  if (s === 'fatal') {   return FATAL;   }
  if (s === 'timeout') { return TIMEOUT; }
  return 0;
}



/**
 * Jest runner for nuclide-test-runner
 * based on https://github.com/facebook/nuclide/blob/v0.0.32/pkg/nuclide/test-runner/example/TestRunnerInterface.js
 * and on https://github.com/klorenz/nuclide-test-runner-pytest
 *
 * jest --verbose --noHighlight
 * jest --json
 */

/*
 export type TestClassSummary = {
   className : string;
   fileName  : string;
   id        : number;
   name      : string;
 };

 export type TestRunInfo = {
   details       : string;
   durationSecs  : number;
   endedTime     : number;
   name          : string;
   numAssertions : number;
   numFailures   : number;
   numMethods    : number;
   numSkipped    : number;
   status        : number;
   summary       : string;
   test_json     : TestClassSummary;
 };
*/


const TESTRUNS = {};
let runId = 0;

/**
 * Objects returned from `getByUri` should implement the functions outlined in this interface. The
 * runner is reponsible for handling request/run IDs.
 */
class JestTestRunner {

  constructor(uri) {
    this.uri = uri;
    this.emitter = new Emitter();
  }

  /**
   * Calls `callback` when testing process is successfully spawned.
   *
   * @returns a `Disposable` on which `dispose` can be called to stop listening to this event.
   */
  onDidStart(cb) {
    setTimeout(function() { cb(runId); }, 100);

    return this.emitter.on('did-start', cb);
  }

  // summary: {runId: number; summaryInfo: Array<TestClassSummary>;})
  
  /**
   * Calls `callback` when an unhandled error occurs with the testing process. Further output from
   * the testing process is ignored after an error event.
   */
  onError(cb) {
    // callback({runId:100, error:{}})
    return this.emitter.on('error', cb);
  }

  /**
   * Runs tests for `path`.
   *
   * Resolves to the ID assigned to this test run that will be returned in all events that
   * originate from this test run to enable the client to associate events with runs.
   */
  run(path) {
    // console.log('run called with', path);
    
    ++runId;
    
    const TR = {
      stdout: '',
      stderr: ''
    };
    TESTRUNS[runId] = TR;
    
    const args = ['--json', '--verbose'];
    TR.currentProcess = jest = spawn('node_modules/.bin/jest', args, {cwd: this.uri});
    
    const summaryInfo = [];
    TR.summaryInfo = summaryInfo;

    jest.stderr.on('data', (data) => {
      TR.stderr += data;
      this.emitter.emit('stderr', {runId:runId, data:data});
    });
    
    jest.stdout.on('data', (data) => {
      TR.stdout += data;
      this.emitter.emit('stdout', {runId:runId, data:data});
    });
    
    jest.stdout.on('error', (error) => {
      // console.log("error", error);
      this.emit('error', {runId:runId, error:error});
      this.finallyFn(runId);
    });
    
    jest.stdout.on('close', (code) => {
      // console.log("close", code);
      
      const data = JSON.parse(TR.stdout);
      
      // console.log( 'OUT', data);
      // console.log( 'ERR', TR.stderr);
      
      data.testResults.forEach((tr) => {
        this.emitter.emit('run-test', {
          runId: runId,
          testInfo: {
            details      : tr.message || 'MESSAGE',
            durationSecs : (tr.endTime - tr.startTime) / 1000,
            endedTime    : tr.endTime,
            name         : tr.name,
            status       : statusNumFromString(tr.status),
            summary      : tr.summary || 'SUMMARY',
            test_json: {
              className : tr.name,
              name      : tr.name,
              fileName  : tr.name,
              id        : tr.name
            }
          }
        });
      });
      
      this.finallyFn(runId);
    });  
  }

  /**
   * Stops the test run with `runId`.
   *
   * Resolves to `true` if the given test run ID was found and signalled to stop, otherwise `false`.
   */
  stop(runId) {
    console.log('STOP CALLED?', runId);
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }
  
  do(fn) {
    this.doFn = fn;
    return this;
  }
  
  finally(fn) {
    this.finallyFn = fn;
    return this;
  }
  
  subscribe() {
    // console.log('subscribe');
    
    this.emitter.on('summary',  (m) => { m.kind = 'summary';  this.doFn(m); } );
    this.emitter.on('run-test', (m) => { m.kind = 'run-test'; this.doFn(m); } );
    this.emitter.on('start',    (m) => { m.kind = 'start';    this.doFn(m); } );
    this.emitter.on('error',    (m) => { m.kind = 'error';    this.doFn(m); } );
    this.emitter.on('stdout',   (m) => { m.kind = 'stdout';   this.doFn(m); } ); // ?
    this.emitter.on('stderr',   (m) => { m.kind = 'stderr';   this.doFn(m); } );
    
    setTimeout(() => { this.run(this.uri); }, 0);
    
    return this;
  }
  
  unsubscribe() {
    // console.log('unsubscribe');
    
    this.emitter.dispose();
    
    return this;
  }

}



module.exports = {
  provideTestRunner: (service) => {
    return {
      label: 'Jest',
      runTest: (uri) => {
        // console.log(`request test runner for uri ${uri}`);
        basepath = null;
        
        // console.log('atom', atom);
        
        atom.project.getPaths().forEach(p => {
          if (!path.relative(p, uri).match(/^\.\./)) {
            basepath = p;
          }
        });
        
        // console.log('basepath is now', basepath);

        if (basepath == null) {
          return null;
        }

        console.log(`JEST CALLED ON ${basepath}`);

        return new JestTestRunner(basepath);
      }
    };
  }
};
