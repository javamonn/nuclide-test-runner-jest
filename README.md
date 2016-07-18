# Jest Test Runner for Nuclide


## What?

This is a Jest runner for Nuclide and its nuclide-test-runner.

It is loosely based on <https://github.com/klorenz/nuclide-test-runner-pytest>
with loads of reverse engineering.

It is my first atom and nuclide package and nuclide-test-runner's documentation is mostly lacking.
This helped a bit <https://github.com/facebook/nuclide/blob/v0.0.32/pkg/nuclide/test-runner/example/TestRunnerInterface.js>

It kinda works already though.


## How to install

Install it in atom. It's called `nuclide-test-runner-jest` there.
You can also do it in the console if you prefer `apm install nuclide-test-runner-jest`.



## TODO

* support stopping jest tests
* find opened tab path to run only that test file (currently finding first opened tab in `__tests__` dir)
* display failed test in summary GUI (currently green)
