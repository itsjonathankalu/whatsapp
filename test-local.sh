#!/bin/bash
# test-local.sh - macOS compatible version

API_KEY="${API_KEY:-change-me-in-production}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
TENANT_ID="test-tenant-$(date +%s)"
TEST_NUMBER="${TEST_NUMBER:-5511999887766}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting TicTic API Tests..."
echo "📋 Using tenant: $TENANT_ID"
echo "📞 Test number: $TEST_NUMBER"
echo "🔑 Using API key: $API_KEY"

# Function to check if jq is installed
check_jq() {
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found. Installing...${NC}"
    brew install jq
  fi
}

# Function to pretty print JSON
print_json() {
  if command -v jq &> /dev/null; then
    jq .
  else
    cat
  fi
}

# Function to display QR code in terminal
display_qr() {
  local qr_data="$1"
  
  # Method 1: Try qrcode-terminal with small size
  if command -v qrcode-terminal &> /dev/null; then
    echo "$qr_data" | qrcode-terminal -s small
  # Method 2: Try Python with smaller output
  elif command -v python3 &> /dev/null; then
    python3 -c "
try:
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=1, border=1)
    qr.add_data('''$qr_data''')
    qr.make(fit=True)
    qr.print_ascii(invert=True)
except ImportError:
    print('Install qrcode: pip3 install qrcode')
    print('QR Data:', '''$qr_data'''[:50], '...')
"
  else
    # Method 3: Show shortened version
    echo -e "${YELLOW}QR Code Data (truncated):${NC}"
    echo "${qr_data:0:60}..."
    echo -e "\n${YELLOW}To see QR code, run:${NC}"
    echo "echo '$qr_data' | qrcode-terminal -s small"
  fi
}

# Function to check API response for errors
check_response() {
  local response="$1"
  local step="$2"
  
  if echo "$response" | grep -q '"statusCode".*[45][0-9][0-9]'; then
    echo -e "${RED}❌ $step failed:${NC}"
    echo "$response" | print_json
    return 1
  fi
  return 0
}

check_jq

# 1. Health Check
echo -e "\n🔍 Testing Health Check..."
HEALTH_RESPONSE=$(curl -s $BASE_URL/health)
echo "$HEALTH_RESPONSE" | print_json

# 2. Initialize Session
echo -e "\n${YELLOW}📱 Initializing WhatsApp session...${NC}"
SESSION_RESPONSE=$(curl -s -X POST $BASE_URL/v1/sessions \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant-Id: $TENANT_ID")

if ! check_response "$SESSION_RESPONSE" "Session initialization"; then
  echo -e "${RED}Stopping tests due to session initialization failure${NC}"
  exit 1
fi

echo "$SESSION_RESPONSE" | print_json

# Check if QR code is present and display it
if echo "$SESSION_RESPONSE" | grep -q "qrCode"; then
  QR_CODE=$(echo "$SESSION_RESPONSE" | jq -r '.qrCode')
  
  echo -e "\n${YELLOW}📱 QR Code received! Scan it with WhatsApp:${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  display_qr "$QR_CODE"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "\n${YELLOW}Instructions:${NC}"
  echo "1. Open WhatsApp on your phone"
  echo "2. Go to Settings → Linked Devices → Link a Device"
  echo "3. Scan the QR code above"
  echo -e "\nWaiting for connection..."
  
  # Poll for connection status
  MAX_ATTEMPTS=30
  ATTEMPT=0
  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    STATUS_RESPONSE=$(curl -s $BASE_URL/v1/sessions/status \
      -H "X-API-Key: $API_KEY" \
      -H "X-Tenant-Id: $TENANT_ID")
    
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status' 2>/dev/null || echo "error")
    
    if [ "$STATUS" = "connected" ]; then
      echo -e "\n${GREEN}✅ Connected!${NC}"
      break
    elif [ "$STATUS" = "error" ] || [ "$STATUS" = "disconnected" ]; then
      echo -e "\n${RED}❌ Connection failed${NC}"
      echo "$STATUS_RESPONSE" | print_json
      exit 1
    fi
    
    printf "."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
  done
  
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "\n${RED}❌ Connection timeout after $((MAX_ATTEMPTS * 2)) seconds${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}No QR code in response, session might already be connected${NC}"
fi

# 3. Check final session status before sending message
echo -e "\n📊 Checking session status before sending message..."
STATUS_RESPONSE=$(curl -s $BASE_URL/v1/sessions/status \
  -H "X-API-Key: $API_KEY" \
  -H "X-Tenant-Id: $TENANT_ID")

echo "$STATUS_RESPONSE" | print_json

STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status' 2>/dev/null || echo "error")
if [ "$STATUS" != "connected" ]; then
  echo -e "${YELLOW}⚠️  Session not connected, skipping message test${NC}"
else
  # 4. Send Test Message
  echo -e "\n📤 Sending test message..."
  MESSAGE_RESPONSE=$(curl -s -X POST $BASE_URL/v1/messages/send \
    -H "X-API-Key: $API_KEY" \
    -H "X-Tenant-Id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"to\": \"$TEST_NUMBER\",
      \"message\": \"🚀 TicTic test message $(date +'%H:%M:%S')\"
    }")

  if ! check_response "$MESSAGE_RESPONSE" "Message sending"; then
    echo -e "${YELLOW}Message sending failed, but continuing with other tests${NC}"
  else
    echo "$MESSAGE_RESPONSE" | print_json
  fi
fi

# 6. Final health check
echo -e "\n🏁 Final health check..."
curl -s $BASE_URL/health | print_json

echo -e "\n${GREEN}✅ All tests completed!${NC}"
echo -e "Tenant ID: ${YELLOW}$TENANT_ID${NC}"
echo -e "Keep this terminal open to maintain the session"