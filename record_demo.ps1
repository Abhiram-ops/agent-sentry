# AgentSentry Demo GIF Recording Script
# Requirements: pip install nhi-audit  +  install asciinema from asciinema.org
# Run this in PowerShell then convert the output with agg (asciinema gif generator)
#
# Steps:
# 1. Run this script: .\record_demo.ps1
# 2. Convert to GIF: agg demo.cast demo.gif
# 3. Add demo.gif to README

Write-Host "Starting AgentSentry demo recording..."
Write-Host "Install asciinema from: https://asciinema.org/docs/installation"
Write-Host ""
Write-Host "On Windows, easiest method:"
Write-Host "  1. pip install asciinema"
Write-Host "  2. asciinema rec demo.cast"
Write-Host "  3. Run the demo commands below manually:"
Write-Host ""
Write-Host "  agentsentry providers"
Write-Host "  agentsentry scan mock"
Write-Host "  agentsentry blast `"local/langchain-crm-agent`""
Write-Host ""
Write-Host "  4. Press Ctrl+D to stop recording"
Write-Host "  5. pip install agg"
Write-Host "  6. agg demo.cast demo.gif --cols 100 --rows 30 --font-size 14"
Write-Host ""
Write-Host "Then add this to your README:"
Write-Host "  ![AgentSentry Demo](demo.gif)"
