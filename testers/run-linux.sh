#!/usr/bin/env bash
# Bash launcher for test-runner
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/test-runner.js" "$@"
