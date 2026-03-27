#!/bin/sh
if [ "$SERVICE" = "worker" ]; then
  exec node packages/worker/dist/index.js
else
  exec node packages/server/dist/index.js
fi
