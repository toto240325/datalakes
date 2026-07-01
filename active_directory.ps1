# to excute, right-click on active_directory.ps1 and "open with Powershell"
# email 26/04/20121 RE: IM0020228618 is on hold and waiting for your input - FL -- Powershell Active Directory# 
#     Note please that you have to install RSAT from the EC Store in order to be able to import the AD module into powershell.



Import-Module ActiveDirectory

#Get-ADUser -Filter {("Name -like 'derr*'") -And ("Surname -eq 'eric'")} -Properties name
#Get-ADUser -Filter {(Name -Like "Derr*") -And (Surname -eq "derruine")} -Properties name,thumbnailphoto
#Get-ADUser -Filter {(Name -Like "Derr*") -And (thumbnailPhoto -like "*" )} -Properties name,thumbnailphoto
#Get-ADUser -Filter {(Name -Like "*") -And (thumbnailPhoto -like "*" ) -And (company -eq "EC-DIGIT")} -Properties name,thumbnailphoto | select name > C:\users\derruer\mydata\bat\b.txt
#Get-ADUser -Filter {(Name -Like "*") -And (enabled -eq $true) -and  (mobile -like "*" ) -And (company -eq "EC-DIGIT")} -Properties name, mobile 
#Get-ADUser -Filter {(Name -Like "de*") -And (enabled -eq $true) -And (thumbnailPhoto -like "*" ) 
#    -And (company -eq "EC-DIGIT") -and (-not (name -like "*DIGIT-EXT*")) } -Properties name,thumbnailphoto | select name #Measure-Object
#Get-ADUser -Filter {(Name -Like "ad*") -And (enabled -eq $true) } -properties company,officephone,mobile| select givenname,surname,company,officephone,mobile
#Get-ADUser -LDAPFilter “(Title=*)” -Properties Title  | select Name, Title
#get-help about_ActiveDirectory_Filter 

$outputFile = "C:\Users\derruer\OneDrive - European Commission\ec-info\EC-info $(get-date -f yyyy-MM-dd-HH-mm-ss).csv"
write-output "" > $outputFile
$users = $null  

$pos = 0
$i=1
write-host "Now loading the active directory in memory.  Be patient, it can last 1 minute or two..."
#$users = Get-ADUser -Filter {(givenname -Like "*") -And (surname -Like "*") -And (enabled -eq $true) -and (company -gt "!") -and (office -gt '!') } -properties company,department,office,officePhone,mobile,thumbnailphoto,name,SamAccountName
#$users = Get-ADUser -Filter {(givenname -Like "*") -And (surname -Like "*") -And (enabled -eq $true) -and (company -gt "!") } -properties company,department,office,officePhone,mobile,thumbnailphoto,name,SamAccountName

# the trick of "where {$_.enabled -eq $true} " is necessary as a workaround because if the enabled property is missing then the record is not filtered out but part of the results, which is wrong since it could mean it's a deleted account
$users = Get-ADUser -Filter {(givenname -Like "*") -And (surname -Like "*") -And (enabled -eq $true) -and (company -gt "!") } -properties company,department,office,officePhone,mobile,thumbnailphoto,name,SamAccountName | where {$_.enabled -eq $true} 


write-host "Output file : " $outputfile
ForEach($user in ($users | sort department,surname))  
    {    
      if ($i % 100 -eq 0) { 
        $mytime = "$((Get-Date).ToString())" 
        write-host "$mytime Processing : " $i 
      }
      $pict = ""
       $name = $user.name
      $pos = $name.indexof("-EXT")
      $statut = "STAT"
      if ( $pos -ge 0 ) { $statut = "PREST" }
      if ($user.thumbnailphoto -ne $null) { $pict = "Pict" }
      write-output "$i`t$($user.givenname) $($user.surname)`t$($user.givenname)`t$($user.surname)`t$($user.company)`t$($user.department)`t$($user.office)`t$($user.officephone)`t$($user.mobile)`t$pict`t$name`t$statut`t$($user.SamAccountName)" >> $OutputFile
      $i++  

    }  
	
write-host "Now open $outputFile in Excel and save it as C:\users\OneDrive - European Commission\ec-info\EC-info.xlsx"

Write-Host "Press any key to continue ..."
pause

