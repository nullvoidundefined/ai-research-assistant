#!/bin/sh
set -e
pnpm --filter @research/common build
if [ "$SERVICE" = "worker" ]; then
  pnpm --filter worker build
else
  pnpm --filter server build
fi
