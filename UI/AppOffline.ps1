param(
    [switch] $set = $false,
    [switch] $release = $false,
    [Parameter(Mandatory = $true)]
    [System.IO.FileInfo] $source,
    [Parameter(Mandatory = $true)]
    [string] $servers,

    $maxAttempts = 5,
    $sleepTime = 10
)

if (($set -and $release) -or (-not $set -and -not $release)) {
    throw 'Must specify $set or $release'
}

#$srcPath = "C:\Code\Workspace\HomeBuilder Apps\Pulte Home Designer\Dev\Source\Phd\src\Container\app_offline.htm"
#$destPath = "\\pghdweb1d\d$\Websites\PulteHomeDesigner\app_offline.htm"

$attempts = 0

foreach ($server in $servers -split ',') {
[System.IO.FileStream]$file = $null
try {
    while ($attempts -lt $maxAttempts -and $file -eq $null) {
        try {
            $destination = "\\$server\d$\Websites\PulteHomeDesigner\app_offline.htm"
            $file = [System.IO.File]::Open($destination, "OpenOrCreate", "ReadWrite", "Delete")
        } catch {
            write-host "File in use...waiting"
            $attempts += 1
            start-sleep -Seconds $sleepTime
        }
    }

    if ($file -eq $null) {
        throw "Not able to write to $destination"
    }

    [xml]$html = $null

    if ($file.length -eq 0) {
        $html = get-content $source
    } else {
        $reader = [System.IO.StreamReader]::new($file)
        $html = $reader.ReadToEnd()
    }

    $releases = $html.GetElementsByTagName("releases")[0]
    [int]$count = $releases.GetAttribute("count")
    if ($set) {
        $count += 1
    }
    if ($release) {
        $count -= 1
        if ($count -lt 0) {
            $count = 0
        }
    }
    $releases.SetAttribute("count", $count)
    $file.position = 0
    $html.save($file)

    if ($count -eq 0) {
        [System.IO.File]::Delete($destination)
    }
} finally {
    if ($file -ne $null) {
        $file.close()
    }
}
}