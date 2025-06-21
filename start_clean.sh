#!/bin/bash
-c
kill $(lsof -t -i:10947) 2>/dev/null || true
godspeed serve