# Jest Test Runner for Nuclide


## What?

This is a Jest runner for Nuclide and its nuclide-test-runner.

It is loosely based on [nuclide-test-runner-pytest](https://github.com/klorenz/nuclide-test-runner-pytest) with loads of atom/nuclide reverse engineering.
The [TestRunnerInterface](https://github.com/facebook/nuclide/blob/v0.0.32/pkg/nuclide/test-runner/example/TestRunnerInterface.js) helped too.

It is my first atom and nuclide package and nuclide-test-runner's documentation is mostly lacking so expect bugs.
It kinda works already though. If you want to help out please do.


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
* I don't yet know how to identify the currently opened tab out of all opened tabs/buffers, so I elect the first opened file with `__tests__` in its path (will fix)
* failed tests aren't properly marked red on the summary view yet (they appear green)
* if you have an exception in the test, there's no feedback in the GUI yet
* stopping tests while they're running isn't yet properly handled
