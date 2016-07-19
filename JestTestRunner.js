'use babel';

/* @flow */



const spawn = require('child_process').spawn;
const path = require('path');
const xatom = require('atom'); // atom is already globally defined
const Emitter = xatom.Emitter;
const recursiveReaddir = require('recursive-readdir');



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



const allowedExts = ['js', 'jsx'];

function parseFile(f) {
  const fn = f.split('/').pop();
  const ext = fn.split('.').pop();
  return {
    path : f,
    fn   : fn,
    ext  : ext
  };
}

function itemInArr(item, arr) {
  return arr.indexOf(item) !== -1;
}

function pathOfAllowedExt(path) {
  return itemInArr(parseFile(path).ext, allowedExts);
}

function ignoreFileCriteria(file, stats) {
  if (stats.isDirectory()) { return false; }
  const ext = parseFile(file).ext;
  const validExt = itemInArr(ext, allowedExts);
  return !validExt;
}

function ignoreFileCriteriaWithRegex(rgx) {
  return function(file, stats) {
    if (stats.isDirectory()) { return false; }
    const matches = (rgx === file);
    return !matches;
  }
}



const TESTRUNS = {};
let runId = 0;



class JestTestRunner {

  constructor(uri, jestFile) {
    this.uri = uri;
    this.jestFile = jestFile;
    this.emitter = new Emitter();
    this.testsDir = uri + '/__tests__';
  }

  run() {
    ++runId;
    
    const TR = {
      stdout: '',
      stderr: ''
    };
    TESTRUNS[runId] = TR;
    
    let args = ['--json']; // , 'verbose'];
    if (this.jestFile) {
      args.push(this.jestFile);
    }
    
    this.emitter.emit('stderr', {runId:runId, data: `> jest ${args.join(' ')}` });
    
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
      // this.finallyFn(runId);
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
            //details      : tr.message ? 'Runtime error on test module' : 'Test module did run',
            //details      : tr.message ? `Test ${tr.name} failed` : `Test ${tr.name} passed`,
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
    
    setTimeout(() => { this.run(); }, 0);
    
    
    
    const ignoreFn = ( this.jestFile ? ignoreFileCriteriaWithRegex(this.jestFile) : ignoreFileCriteria );
    
    recursiveReaddir(this.testsDir, [ignoreFn], (err, files) => {
      if (!err) {
        const summaryInfo = files.map((f) => {
          const o = parseFile(f);
          return {
            fileName  : f,
            id        : f,
            classname : o.fn,
            name      : f.substring( this.testsDir.length + 1)
          };
        });
        
        // console.log('summaryInfo', summaryInfo);
        
        this.emitter.emit('summary', {runId:runId, summaryInfo:summaryInfo});
      }
    });
    
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
      runTest: (openedFilePath) => {
        // console.log(`request test runner for openedFilePath ${openedFilePath}`);
        
        basepath = null;
        
        let jestFile = '';
        
        if (itemInArr('/__tests__/', openedFilePath) && pathOfAllowedExt(openedFilePath)) {
          jestFile = openedFilePath;
        }
        
        atom.project.getPaths().forEach(p => {
          if (!path.relative(p, openedFilePath).match(/^\.\./)) {
            basepath = p;
          }
        });

        if (basepath == null) {
          return null;
        }

        // console.log(`Jest called with basepath: "${basepath}" and jestFile: "${jestFile}"`);

        return new JestTestRunner(basepath, jestFile);
      }
    };
  }
};
