#!/usr/bin/env sh
cd "$(dirname "$0")"
export PYTHONPATH="$(pwd):$(pwd)/..:${PYTHONPATH}"
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
