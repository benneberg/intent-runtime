name: Feature Request
description: Suggest an idea or enhancement for Intent Runtime
title: "[FEAT]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: Thank you for suggesting a feature or improvement!
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: Is your feature request related to a specific problem or architectural limitation?
    validations:
      required: true
  - type: textarea
    id: proposed_solution
    attributes:
      label: Proposed Solution
      description: Describe the solution or workflow you'd like to see implemented.
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Any alternative solutions or features you considered.
    validations:
      required: false
