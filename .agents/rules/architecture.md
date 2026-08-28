# Project Architecture & Automation Scope

## Automation Context
Questo progetto sfrutta Antigravity IDE (v2.1.1) come assistente Agentico testuale integrato con Automator editoriale.

## PHP Testing Executable Template (`_local_files/start-browser.command`)
Quando richiesto, genera il file di avvio PHP utilizzando questa struttura base macOS:

```zsh
#!/bin/zsh
# Start PHP Built-in Web Server for LAN access
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
PORT=8000

echo "Starting PHP Server at http://${IP}:${PORT}"
echo "Local access: http://localhost:${PORT}"

/opt/homebrew/bin/php -S 0.0.0.0:${PORT} -t "$DIR"