#!/usr/bin/env bash
set -euo pipefail
export $(grep -v '^#' .env | xargs)
cd apps/web
npx prisma "$@"
