$filePath = "c:\Users\Surya Pranav\Downloads\speaking\attention-archaeologist-main\src\pages\Dashboard.tsx"

# Read the file
$content = Get-Content $filePath -Raw

# Fix 1: Add optional chaining for structural_insights
$content = $content -replace 'Object\.entries\(audienceAnalysis\.structural_insights\)', 'audienceAnalysis.structural_insights && Object.entries(audienceAnalysis.structural_insights)'

# Write back
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "Safety checks added successfully!"
