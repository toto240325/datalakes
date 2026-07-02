# Bulk photo extraction from Active Directory
# Extracts thumbnailPhoto for all EC users and saves as JPEG files
# Photos are named by SamAccountName (login username)
#
# Usage: right-click and "Run with PowerShell"  
# Or:    powershell -ExecutionPolicy Bypass -File get_photos.ps1
#
# Tip: Run from the EC network. Takes ~5 min for the initial AD query,
#      then a few minutes to save all photos.
#
# Output: data/photos/<samaccountname>.jpg

Import-Module ActiveDirectory

$outputDir = "C:\Users\derruer\mydata\projects-local\datalakes\data\photos"
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

# Also export a mapping file: username -> display name -> department
$mappingFile = "C:\Users\derruer\mydata\projects-local\datalakes\data\photo_mapping.csv"

Write-Host "=== EC Photo Extraction ==="
Write-Host "Output: $outputDir"
Write-Host ""
Write-Host "Step 1: Loading users with photos from AD (this takes ~5 min)..."

$startTime = Get-Date

$users = Get-ADUser -Filter {
    (givenname -Like "*") -And 
    (surname -Like "*") -And 
    (enabled -eq $true) -And 
    (company -gt "!") -And
    (thumbnailPhoto -like "*")
} -Properties SamAccountName, givenName, surname, thumbnailPhoto, company, department, displayName |
Where-Object { $_.enabled -eq $true -and $_.thumbnailPhoto -ne $null }

$elapsed = ((Get-Date) - $startTime).TotalSeconds
Write-Host "  Found $($users.Count) users with photos (took $([math]::Round($elapsed))s)"
Write-Host ""
Write-Host "Step 2: Saving photos..."

$i = 0
$saved = 0
$skipped = 0
$mapping = @()

foreach ($user in ($users | Sort-Object department, surname)) {
    $i++
    if ($i % 1000 -eq 0) {
        Write-Host "  Progress: $i / $($users.Count) (saved: $saved, skipped: $skipped)"
    }
    
    $photoPath = Join-Path $outputDir "$($user.SamAccountName).jpg"
    
    # Build mapping entry
    $mapping += "$($user.SamAccountName)`t$($user.givenName) $($user.surname)`t$($user.company)`t$($user.department)"
    
    # Skip if already exists (for resume on re-runs)
    if (Test-Path $photoPath) { 
        $skipped++
        continue 
    }
    
    try {
        [System.IO.File]::WriteAllBytes($photoPath, $user.thumbnailPhoto)
        $saved++
    } catch {
        # silently skip errors
    }
}

# Save mapping
"SamAccountName`tDisplayName`tCompany`tDepartment" | Out-File $mappingFile -Encoding UTF8
$mapping | Out-File $mappingFile -Append -Encoding UTF8

$totalElapsed = ((Get-Date) - $startTime).TotalSeconds
Write-Host ""
Write-Host "=== Done in $([math]::Round($totalElapsed))s ==="
Write-Host "  New photos saved: $saved"
Write-Host "  Skipped (already exist): $skipped"
Write-Host "  Total in folder: $((Get-ChildItem $outputDir -Filter *.jpg).Count)"
Write-Host "  Mapping: $mappingFile"
Write-Host ""
Write-Host "Press any key to continue..."
pause
