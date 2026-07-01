
ldap:
powershell -NoProfile -Command "Import-Module ActiveDirectory; Get-ADUser -Filter {(SamAccountName -eq 'buhrbbu')} -Properties company,department,office,officePhone,mobile,mail,GivenName,Surname,DisplayName,EmployeeNumber,employeeType,City,Manager,MemberOf,whenCreated,Modified | Select-Object GivenName,Surname,DisplayName,mail,company,department,office,officePhone,mobile,EmployeeNumber,employeeType,City,Manager,whenCreated,Modified | Format-List | Out-File -FilePath 'C:\Users\derruer\mydata\projects-local\datalakes\buhr_info.txt' -Encoding UTF8 -Width 300; Write-Host 'DONE'"
DONE

Here's what we can extract from LDAP for Carl-Christian Buhr:

Field	Value
GivenName	Carl-Christian
Surname	BUHR
DisplayName	BUHR Carl-Christian (DIGIT)
Email	Carl-Christian.BUHR@ec.europa.eu
Company (DG)	EC-DIGIT
Department	DIGIT.A
Office	L107 11/007
Office Phone	+32 229-68599
Mobile	+32 460794799
Employee Number	00161553
Employee Type	O (Official)
City	BRU (Brussels)
Manager	(empty)
Account Created	10/15/2021
Last Modified	6/24/2026

-------------------------------
# Crawl just one DG (fast, ~3 min):
node crawl_full_organigram.js --dg DIGIT --depth 3 --output digit_organigram.json

# Crawl all DGs, directorates only (depth 2, ~15 min):
node crawl_full_organigram.js --depth 2 --output ec_organigram.json

# Full crawl with units (depth 3, ~2-3 hours for all 49 DGs):
node crawl_full_organigram.js --depth 3 --output ec_organigram_full.json

-----------------------------------------------

ound them! The key URLs are:

API Publisher: https://webgate.ec.testa.eu/publisher/
API DevPortal: https://webgate.ec.testa.eu/devportal
For Developers page: https://citnet.tech.ec.europa.eu/CITnet/confluence/spaces/APIGTW/pages/1143508232/...


-----------------------------------

# Same prerequisites as before: Edge with remote debugging + authenticated session
node crawl_people.js --dg DIGIT          # test with one DG first
node crawl_people.js                      # full Commission
node crawl_people.js --resume             # resume if interrupted
-----------------
When finished: 
node webapp/build_data.cjs to rebuild the webapp data
then refresh the browser at http://localhost:8080
