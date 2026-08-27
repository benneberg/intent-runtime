name: Bug Report
description: Create a report to help us reproduce and fix a bug
title: "[BUG]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: Thanks for taking the time to report a bug in Intent Runtime!
  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Detailed steps to reproduce the behavior.
      placeholder: |
        1. Start the server with `npm run dev`
        2. Send POST /api/session/input with payload ...
        3. Observe error ...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen.
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment & Version
      description: Node.js version, OS, browser, etc.
      placeholder: |
        - OS: Linux / macOS / Windows
        - Node version: v20.x
        - Browser: Chrome / Firefox / Safari
    validations:
      required: false
