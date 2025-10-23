# PowerShell launcher for test-runner
Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Path -Parent)
node .\test-runner.js $args
Pop-Location
