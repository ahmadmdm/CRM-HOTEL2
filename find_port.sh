#!/bin/bash
for pid in $(ls /proc | grep -E '^[0-9]+$' 2>/dev/null); do
  for fd in $(ls /proc/$pid/fd 2>/dev/null); do
    link=$(readlink /proc/$pid/fd/$fd 2>/dev/null)
    if [ "$link" = "socket:[734336]" ] || [ "$link" = "socket:[713548]" ]; then
      echo "Found: PID=$pid"
      cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' '
      echo ""
    fi
  done
done
