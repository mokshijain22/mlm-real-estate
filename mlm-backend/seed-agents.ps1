$base = "http://localhost:5000/api/auth"

function Register-Agent($name, $email, $phone, $pan, $refCode) {
    $body = @{
        name = $name
        email = $email
        phone = $phone
        pan_number = $pan
        password = "password123"
        password_confirmation = "password123"
        referral_code = $refCode
        terms = $true
    } | ConvertTo-Json

    $body | Out-File -Encoding utf8 temp_register.json

    $res = curl.exe -s -X POST "$base/register" `
        -H "Content-Type: application/json" `
        -d "@temp_register.json"

    Write-Host "`n--- $name ---"
    Write-Host $res

    return ($res | ConvertFrom-Json)
}

# --- Level 1: three agents directly under 112233 (admin) ---
$d1 = Register-Agent "Downline One"   "downline1@test.com" "9000000001" "ABCDE1111F" "112233"
$d2 = Register-Agent "Downline Two"   "downline2@test.com" "9000000002" "ABCDE2222F" "112233"
$d3 = Register-Agent "Downline Three" "downline3@test.com" "9000000003" "ABCDE3333F" "112233"

# --- Level 2: one agent under Downline One ---
if ($d1.user.referralCode) {
    $sub1 = Register-Agent "Sub Agent One" "subagent1@test.com" "9000000004" "ABCDE4444F" $d1.user.referralCode

    # --- Level 3 (optional): under Sub Agent One ---
    if ($sub1.user.referralCode) {
        Register-Agent "Level3 Agent" "level3@test.com" "9000000005" "ABCDE5555F" $sub1.user.referralCode
    }
} else {
    Write-Host "referralCode not found — check the Step 1 backend change, or restart the server"
}