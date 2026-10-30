#!/bin/bash
cd "$(dirname "$0")"
open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null
node server.js
