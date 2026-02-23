#!/bin/bash

# Backend Smoke Test
#
# This script tests that the Convex backend functions are deployed and responding.
# Run with: npm run test:backend
#
# Prerequisites:
# - Convex dev server must be running: npx convex dev

set -e

echo "=== Backend Smoke Test ==="
echo ""

# Test listTasks returns correct shape
echo "Testing tasks:listTasks..."
RESULT=$(npx convex run tasks:listTasks '{"limit": 5}' 2>&1)

# Check for expected fields
if echo "$RESULT" | grep -q '"tasks"'; then
  echo "  ✓ listTasks returned tasks array"
else
  echo "  ✗ listTasks missing tasks array"
  echo "  Response: $RESULT"
  exit 1
fi

if echo "$RESULT" | grep -q '"nextCursor"'; then
  echo "  ✓ listTasks returned nextCursor"
else
  echo "  ✗ listTasks missing nextCursor"
  echo "  Response: $RESULT"
  exit 1
fi

echo ""
echo "=== All Backend Tests Passed ==="
