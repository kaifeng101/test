#!/bin/sh

# Function to perform actions on shutdown
shutdown() {
  echo "Running deck dump before shutdown..."
  echo "Overwriting /deck/kong.yaml..."
  deck gateway dump -o /deck/kong.yaml --yes --kong-addr http://kong:8001
  exit 0
}

# Trap and call shutdown function
trap shutdown SIGTERM SIGINT

# Start Up Commands
echo "Running deck diff and sync on startup..."
deck gateway sync --kong-addr http://kong:8001 /deck/kong.yaml

# Keep the script running to listen for SIGTERM signal
tail -f /dev/null & wait $!