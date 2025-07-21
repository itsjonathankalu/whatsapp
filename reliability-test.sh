#!/bin/bash
# reliability-test.sh - Simple wrapper for the TypeScript reliability tester

set -e

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx not found. Installing..."
    npm install -g tsx
fi

# Default environment
export API_URL="${API_URL:-http://localhost:3000}"
export API_KEY="${API_KEY:-change-me-in-production}"
export TENANT_ID="${TENANT_ID:-reliability-test}"

echo "🔧 Starting reliability test with:"
echo "   API_URL: $API_URL"
echo "   TENANT_ID: $TENANT_ID"
echo "   TEST_NUMBER: ${TEST_NUMBER:-not set}"
echo ""

# Run the TypeScript test
tsx src/tools/reliability-test.ts "$@" 