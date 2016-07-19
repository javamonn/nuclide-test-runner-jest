# Jest Test Runner for Nuclide


## What?

This is a Jest runner for Nuclide and its nuclide-test-runner.

It is loosely based on [nuclide-test-runner-pytest](https://github.com/klorenz/nuclide-test-runner-pytest) with loads of atom/nuclide reverse engineering.
[This part](https://github.com/facebook/nuclide/blob/master/pkg/nuclide-test-runner/lib/TestRunnerController.js#L266) helped, along with atom's inspector.

It is my first atom and nuclide package and nuclide-test-runner's documentation is mostly lacking so expect bugs.
It works though. If you want to help out please do.


## Look

![all](shots/all.png)  
by default runs all tests

![single](shots/single.png)  
if you're editing a test file, runs only that one


## How to install

Install it in atom. It's called `nuclide-test-runner-jest` there.

You can also do it in the console if you prefer  
`apm install nuclide-test-runner-jest`


## Assumptions

This package assumes the following:

* the atom project root is the `package.json` root and has `jest-cli` locally installed.
* if you have a test file opened, it is run in isolation, otherwise all tests are run.


## Limitations / TODO

* nuclide-test-runner only fires if you have at least one opened file (can't do anything about this one)
* failed tests aren't properly marked red on the summary view (I believe this is a nuclide-test-runner limitation too)
* stopping tests while they're running doesn't kill jest process (is it reporting back to us that event?)
