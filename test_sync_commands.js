/**
 * Sync System Test Script
 * Quick test examples for sync endpoints
 */

// NOTE: Replace 'YOUR_SESSION_COOKIE' with actual session cookie from browser
// To get session cookie:
// 1. Login as admin in browser
// 2. Open DevTools (F12) → Application → Cookies
// 3. Copy value of 'connect.sid' cookie

const baseURL = 'http://localhost:3000';
const sessionCookie = 'YOUR_SESSION_COOKIE'; // Replace this!

// ============================================
// Test 1: Get Available Tables Info
// ============================================
console.log('=== Test 1: Get Available Tables ===');
console.log(`
curl -X GET "${baseURL}/sync/info" \\
  --cookie "connect.sid=${sessionCookie}"
`);

// ============================================
// Test 2: Export gvmoi
// ============================================
console.log('\n=== Test 2: Export gvmoi ===');
console.log(`
curl -X GET "${baseURL}/sync/export?table=gvmoi" \\
  --cookie "connect.sid=${sessionCookie}" \\
  -o gvmoi_export.json
`);

// ============================================
// Test 3: Export nhanvien
// ============================================
console.log('\n=== Test 3: Export nhanvien ===');
console.log(`
curl -X GET "${baseURL}/sync/export?table=nhanvien" \\
  --cookie "connect.sid=${sessionCookie}" \\
  -o nhanvien_export.json
`);

// ============================================
// Test 4: Export course_schedule_details
// ============================================
console.log('\n=== Test 4: Export course_schedule_details ===');
console.log(`
curl -X GET "${baseURL}/sync/export?table=course_schedule_details" \\
  --cookie "connect.sid=${sessionCookie}" \\
  -o course_schedule_details_export.json
`);

// ============================================
// Test 5: Import gvmoi - New Record (INSERT)
// ============================================
console.log('\n=== Test 5: Import New Teacher (INSERT) ===');
console.log(`
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "gvmoi",
    "data": [
      {
        "CCCD": "SYNC_TEST_001",
        "HoTen": "Nguyen Van Test",
        "MaPhongBan": "CNTT",
        "DienThoai": "0900000001",
        "TinhTrangGiangDay": 1
      }
    ]
  }'
`);
console.log('Expected: inserted: 1, updated: 0');

// ============================================
// Test 6: Import gvmoi - Update Record (UPDATE)
// ============================================
console.log('\n=== Test 6: Import Existing Teacher (UPDATE) ===');
console.log(`
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "gvmoi",
    "data": [
      {
        "CCCD": "SYNC_TEST_001",
        "HoTen": "Nguyen Van Test - UPDATED",
        "MaPhongBan": "ATTT",
        "DienThoai": "0900000001",
        "TinhTrangGiangDay": 1
      }
    ]
  }'
`);
console.log('Expected: inserted: 0, updated: 1');

// ============================================
// Test 7: Import nhanvien - New Employee (INSERT)
// ============================================
console.log('\n=== Test 7: Import New Employee (INSERT) ===');
console.log(`
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "nhanvien",
    "data": [
      {
        "tendangnhap": "sync_test_user",
        "matkhau": "test123",
        "id_User": 9999,
        "TenNhanVien": "Test Employee Sync",
        "CCCD": "SYNC_EMP_001",
        "MaPhongBan": "CNTT",
        "TinhTrangGiangDay": 1
      }
    ]
  }'
`);
console.log('Expected: inserted: 1, updated: 0');
console.log('Note: Creates both taikhoannguoidung and nhanvien records');

// ============================================
// Test 8: Import from File
// ============================================
console.log('\n=== Test 8: Import from Exported File ===');
console.log(`
# First export from PUBLIC DB
curl -X GET "${baseURL}/sync/export?table=gvmoi" \\
  --cookie "connect.sid=${sessionCookie}" \\
  > gvmoi_export.json

# Then import to PRIVATE DB (format the file first)
echo '{"table": "gvmoi", "data": ' > import_gvmoi.json
cat gvmoi_export.json | jq '.data' >> import_gvmoi.json
echo '}' >> import_gvmoi.json

# Import
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d @import_gvmoi.json
`);

// ============================================
// Test 9: Verify No Duplicates
// ============================================
console.log('\n=== Test 9: Verify No Duplicates ===');
console.log(`
# Import same data twice
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "gvmoi",
    "data": [{"CCCD": "DUP_TEST", "HoTen": "Duplicate Test"}]
  }'

# Import again - should UPDATE, not create duplicate
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "gvmoi",
    "data": [{"CCCD": "DUP_TEST", "HoTen": "Duplicate Test"}]
  }'

# Verify in database: should only have ONE record with CCCD='DUP_TEST'
`);

// ============================================
// Test 10: Error Handling
// ============================================
console.log('\n=== Test 10: Error Handling ===');
console.log(`
# Test missing natural key
curl -X POST ${baseURL}/sync/import \\
  --cookie "connect.sid=${sessionCookie}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "table": "gvmoi",
    "data": [{"HoTen": "Missing CCCD"}]
  }'

# Expected: Error in response about missing CCCD
`);

// ============================================
// Running Instructions
// ============================================
console.log('\n\n=== HOW TO RUN THESE TESTS ===');
console.log('1. Start the server: npm start');
console.log('2. Login as admin in browser');
console.log('3. Get session cookie from DevTools');
console.log('4. Replace YOUR_SESSION_COOKIE in this file');
console.log('5. Copy-paste commands above into terminal');
console.log('6. Or run: node test_sync_commands.js > test_commands.sh');
console.log('7. Then execute: bash test_commands.sh\n');
