#!/usr/bin/env bash
# API-level test suite for the project submission dashboard.
#
# Usage:  bash scripts/api-tests.sh [api-base-url]
#
# Requires the API to be running. The auth rate limiter allows 20 auth requests
# per IP per 15 minutes, so restart the API (or wait) between runs; otherwise
# the signup/login steps fail with 429.
set -u
API="${1:-http://localhost:4000}"
PASS=0
FAIL=0
JAR="$(mktemp)"
rm -f "$JAR"

check() { # check <label> <expected-status> <actual-status>
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    printf '  PASS  %-52s %s\n' "$label" "$actual"
  else
    FAIL=$((FAIL + 1))
    printf '  FAIL  %-52s expected %s got %s\n' "$label" "$expected" "$actual"
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
body() { curl -s "$@"; }

echo "=== 1. Health ==="
check "GET /api/health" 200 "$(status $API/api/health)"

echo
echo "=== 2. Auth guards ==="
check "GET /api/auth/me (no token)" 401 "$(status $API/api/auth/me)"
check "GET /api/auth/me (bad token)" 401 "$(status -H 'Cookie: token=not-a-jwt' $API/api/auth/me)"
check "GET /api/submissions (no token)" 401 "$(status $API/api/submissions)"

echo
echo "=== 3. Mentor login ==="
LOGIN=$(body -c "$JAR" -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"mentor@assessment.dev","password":"Mentor@123"}')
check "POST /api/auth/login (valid)" 200 "$(status -c "$JAR" -o /dev/null -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"email":"mentor@assessment.dev","password":"Mentor@123"}')"
echo "$LOGIN" | grep -q '"role":"MENTOR"' && { PASS=$((PASS+1)); echo "  PASS  login returns MENTOR role"; } || { FAIL=$((FAIL+1)); echo "  FAIL  login role: $LOGIN"; }
check "POST /api/auth/login (bad password)" 401 "$(status -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"email":"mentor@assessment.dev","password":"wrong-password"}')"
check "POST /api/auth/login (unknown email)" 401 "$(status -X POST $API/api/auth/login -H 'Content-Type: application/json' -d '{"email":"nobody@example.com","password":"whatever1"}')"
check "GET /api/auth/me (mentor)" 200 "$(status -b "$JAR" $API/api/auth/me)"

echo
echo "=== 4. Mentor listing / filters / search / sort / pagination ==="
check "GET /api/submissions" 200 "$(status -b "$JAR" $API/api/submissions)"
for st in PENDING APPROVED REJECTED; do
  check "GET /api/submissions?status=$st" 200 "$(status -b "$JAR" "$API/api/submissions?status=$st")"
done
check "GET /api/submissions?status=BOGUS" 400 "$(status -b "$JAR" "$API/api/submissions?status=BOGUS")"
check "GET /api/submissions?sort=name" 200 "$(status -b "$JAR" "$API/api/submissions?sort=name")"
check "GET /api/submissions?sort=oldest" 200 "$(status -b "$JAR" "$API/api/submissions?sort=oldest")"
check "GET /api/submissions?sort=bogus" 400 "$(status -b "$JAR" "$API/api/submissions?sort=bogus")"
check "GET /api/submissions?search=ayesha" 200 "$(status -b "$JAR" "$API/api/submissions?search=ayesha")"
check "GET /api/submissions?page=2&limit=5" 200 "$(status -b "$JAR" "$API/api/submissions?page=2&limit=5")"
check "GET /api/submissions?limit=999" 400 "$(status -b "$JAR" "$API/api/submissions?limit=999")"

META=$(body -b "$JAR" "$API/api/submissions?page=2&limit=5")
echo "$META" | grep -q '"meta"' && { PASS=$((PASS+1)); echo "  PASS  pagination meta present"; } || { FAIL=$((FAIL+1)); echo "  FAIL  no meta: $META"; }
FILTERED=$(body -b "$JAR" "$API/api/submissions?status=APPROVED")
echo "$FILTERED" | grep -qi '"APPROVED"' && { PASS=$((PASS+1)); echo "  PASS  status filter returns APPROVED rows"; } || { FAIL=$((FAIL+1)); echo "  FAIL  status filter: $FILTERED"; }
NONMATCH=$(body -b "$JAR" "$API/api/submissions?search=zzz_no_such_project_zzz")
if echo "$NONMATCH" | grep -q '"data":\[\]'; then
  PASS=$((PASS+1)); echo "  PASS  search with no match returns empty list"
else
  FAIL=$((FAIL+1)); echo "  FAIL  no-match search: $NONMATCH"
fi

echo
echo "=== 5. Stats ==="
STATS=$(body -b "$JAR" $API/api/submissions/stats)
echo "$STATS" | grep -q '"total"' && { PASS=$((PASS+1)); echo "  PASS  stats payload: $STATS"; } || { FAIL=$((FAIL+1)); echo "  FAIL  stats: $STATS"; }

echo
echo "=== 6. Signup validation ==="
EMAIL="tester$(date +%s)@example.com"
check "POST /api/auth/signup (valid)" 201 "$(status -X POST $API/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"Test Student\",\"email\":\"$EMAIL\",\"password\":\"Passw0rd!\"}")"
check "POST /api/auth/signup (duplicate email)" 409 "$(status -X POST $API/api/auth/signup -H 'Content-Type: application/json' -d "{\"name\":\"Test Student\",\"email\":\"$EMAIL\",\"password\":\"Passw0rd!\"}")"
WEAK=$(body -X POST $API/api/auth/signup -H 'Content-Type: application/json' -d '{"name":"x","email":"bad-email","password":"short"}')
check "POST /api/auth/signup (invalid payload)" 400 "$(status -o /dev/null -X POST $API/api/auth/signup -H 'Content-Type: application/json' -d '{"name":"x","email":"bad-email","password":"short"}')"
echo "$WEAK" | grep -q '"errors"' && { PASS=$((PASS+1)); echo "  PASS  field-level errors: $WEAK"; } || { FAIL=$((FAIL+1)); echo "  FAIL  no field errors: $WEAK"; }

echo
echo "=== 7. Student RBAC + submissions ==="
SJAR="$(mktemp)"
check "POST /api/auth/login (student)" 200 "$(status -c "$SJAR" -o /dev/null -X POST $API/api/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"Passw0rd!\"}")"
check "GET /api/submissions (student -> 403)" 403 "$(status -b "$SJAR" $API/api/submissions)"
check "GET /api/submissions/stats (student -> 403)" 403 "$(status -b "$SJAR" $API/api/submissions/stats)"
check "GET /api/submissions/mine (student)" 200 "$(status -b "$SJAR" $API/api/submissions/mine)"

SUBJ=$(mktemp)
CODE=$(curl -s -o "$SUBJ" -w '%{http_code}' -b "$SJAR" -X POST $API/api/submissions -H 'Content-Type: application/json' \
  -d '{"projectName":"Test Project","repoUrl":"https://github.com/demo/test","liveUrl":"https://test.example.com","description":"A description that is definitely longer than twenty characters."}')
SUB=$(cat "$SUBJ")
check "POST /api/submissions (valid)" 201 "$CODE"
SID=$(echo "$SUB" | grep -o '"submission":{"id":"[^"]*"' | head -1 | sed 's/.*"id":"\([^"]*\)".*/\1/')
[ -z "$SID" ] && SID=$(echo "$SUB" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
echo "  (submission id: $SID)"

DUP=$(body -b "$SJAR" -X POST $API/api/submissions -H 'Content-Type: application/json' \
  -d '{"projectName":"Duplicate Project","repoUrl":"https://github.com/demo/dup","description":"A duplicate description that is longer than twenty characters."}')
check "POST /api/submissions (duplicate -> 409)" 409 "$(status -b "$SJAR" -o /dev/null -X POST $API/api/submissions -H 'Content-Type: application/json' -d '{"projectName":"Duplicate Project 2","repoUrl":"https://github.com/demo/dup2","description":"A duplicate description that is longer than twenty characters."}')"
echo "$DUP" | grep -qi 'already\|active\|existing' && { PASS=$((PASS+1)); echo "  PASS  duplicate message: $DUP"; } || { FAIL=$((FAIL+1)); echo "  FAIL  duplicate message: $DUP"; }
check "POST /api/submissions (invalid url -> 400)" 400 "$(status -b "$SJAR" -o /dev/null -X POST $API/api/submissions -H 'Content-Type: application/json' -d '{"projectName":"Bad URL","repoUrl":"not-a-url","description":"A description that is definitely longer than twenty characters."}')"
check "POST /api/submissions (short description -> 400)" 400 "$(status -b "$SJAR" -o /dev/null -X POST $API/api/submissions -H 'Content-Type: application/json' -d '{"projectName":"Short Description","repoUrl":"https://github.com/demo/x","description":"too short"}')"
check "POST /api/submissions (mentor -> 403)" 403 "$(status -b "$JAR" -o /dev/null -X POST $API/api/submissions -H 'Content-Type: application/json' -d '{"projectName":"Mentor Try","repoUrl":"https://github.com/demo/m","description":"A description that is definitely longer than twenty characters."}')"

echo
echo "=== 8. Mentor review actions ==="
echo "  (submission id: $SID)"
check "PATCH status APPROVED" 200 "$(status -b "$JAR" -o /dev/null -X PATCH "$API/api/submissions/$SID/status" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}')"
check "PATCH status REJECTED" 200 "$(status -b "$JAR" -o /dev/null -X PATCH "$API/api/submissions/$SID/status" -H 'Content-Type: application/json' -d '{"status":"REJECTED"}')"
check "PATCH status PENDING (invalid -> 400)" 400 "$(status -b "$JAR" -o /dev/null -X PATCH "$API/api/submissions/$SID/status" -H 'Content-Type: application/json' -d '{"status":"PENDING"}')"
check "PATCH unknown id (-> 404)" 404 "$(status -b "$JAR" -o /dev/null -X PATCH "$API/api/submissions/does-not-exist/status" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}')"
check "PATCH status (student -> 403)" 403 "$(status -b "$SJAR" -o /dev/null -X PATCH "$API/api/submissions/$SID/status" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}')"
check "PATCH status (no auth -> 401)" 401 "$(status -o /dev/null -X PATCH "$API/api/submissions/$SID/status" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}')"

echo
echo "=== 9. Rate limiting (submission limiter, 5/15min) ==="
RLJAR="$(mktemp)"
RLMAIL="ratelimit$(date +%s)@example.com"
curl -s -c "$RLJAR" -o /dev/null -X POST $API/api/auth/signup -H 'Content-Type: application/json' \
  -d "{\"name\":\"Rate Limit Student\",\"email\":\"$RLMAIL\",\"password\":\"Passw0rd!\"}"
for i in 1 2 3 4 5 6; do
  code=$(status -b "$RLJAR" -o /dev/null -X POST $API/api/submissions -H 'Content-Type: application/json' \
    -d "{\"projectName\":\"Rate Limit Project $i\",\"repoUrl\":\"https://github.com/demo/rl$i\",\"description\":\"A description that is definitely longer than twenty characters.\"}")
  echo "  attempt $i -> $code"
done
check "6th submission -> 429" 429 "$code"

echo
echo "=== 10. Logout ==="
check "POST /api/auth/logout" 200 "$(status -b "$JAR" -c "$JAR" -o /dev/null -X POST $API/api/auth/logout)"
check "GET /api/auth/me after logout -> 401" 401 "$(status -b "$JAR" $API/api/auth/me)"

echo
echo "======================================"
echo "  PASSED: $PASS   FAILED: $FAIL"
echo "======================================"
[ "$FAIL" -eq 0 ]
