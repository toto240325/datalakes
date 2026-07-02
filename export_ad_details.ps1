# Export AD public fields for all EC users
# Outputs: data/ad_details.csv (tab-separated)
#
# Usage: powershell -ExecutionPolicy Bypass -File export_ad_details.ps1

Import-Module ActiveDirectory

$outputFile = "C:\Users\derruer\mydata\projects-local\datalakes\data\ad_details.csv"

Write-Host "=== EC Active Directory Export ==="
Write-Host "Loading all enabled users..."

$startTime = Get-Date

$users = Get-ADUser -Filter {
    (givenname -Like "*") -And 
    (surname -Like "*") -And 
    (enabled -eq $true) -And 
    (company -gt "!")
} -Properties SamAccountName, givenName, surname, mail, officePhone, office, city, department, company |
Where-Object { $_.enabled -eq $true }

$elapsed = ((Get-Date) - $startTime).TotalSeconds
Write-Host "  Found $($users.Count) users (took $([math]::Round($elapsed))s)"
Write-Host "  Writing to $outputFile..."

# Build all lines in memory then write once (FAST)
$lines = [System.Collections.Generic.List[string]]::new($users.Count + 1)
$lines.Add("SamAccountName`tGivenName`tSurname`tMail`tOfficePhone`tOffice`tCity`tDepartment`tCompany")

foreach ($user in ($users | Sort-Object department, surname)) {
    $lines.Add("$($user.SamAccountName)`t$($user.givenName)`t$($user.surname)`t$($user.mail)`t$($user.officePhone)`t$($user.office)`t$($user.city)`t$($user.department)`t$($user.company)")
}

[System.IO.File]::WriteAllLines($outputFile, $lines)

$totalElapsed = ((Get-Date) - $startTime).TotalSeconds
Write-Host "  Done in $([math]::Round($totalElapsed))s. $($users.Count) users exported."
