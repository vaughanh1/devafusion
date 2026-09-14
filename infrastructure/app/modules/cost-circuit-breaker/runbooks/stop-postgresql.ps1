<#
.SYNOPSIS
    Stops the Devafusion PostgreSQL Flexible Server.

.DESCRIPTION
    Invoked by an Azure Monitor Action Group's automation_runbook_receiver
    when the resource group's consumption budget reaches its 100% actual-
    spend threshold (see docs/adr/0010-relational-database-engine-selection.md,
    "cost circuit breaker" consequence). Stopping the server halts compute
    billing immediately while preserving all data, configuration, and
    firewall rules - it does not delete or purge anything.

    Authenticates via the Automation Account's system-assigned managed
    identity; no credential is embedded in this script (root AGENTS.md,
    Zero Hardcoded Secrets).

.PARAMETER ResourceGroupName
    Resource group containing the PostgreSQL Flexible Server.

.PARAMETER ServerName
    Name of the PostgreSQL Flexible Server to stop.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$ServerName
)

Connect-AzAccount -Identity | Out-Null

Write-Output "Cost circuit breaker triggered: stopping PostgreSQL Flexible Server '$ServerName' in resource group '$ResourceGroupName'."

Stop-AzPostgreSqlFlexibleServer -ResourceGroupName $ResourceGroupName -Name $ServerName

Write-Output "Stop request submitted. The server does not restart automatically - a human must review the budget alert and restart it deliberately once safe."
