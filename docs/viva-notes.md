# Viva preparation notes

## Why readings are separate

A reading is an event in a time series, not a current property of an installation. Keeping it separate preserves history, supports time windows and summaries, and lets delayed readings be stored without overwriting newer observations.

## Why `received_at` exists

`measured_at` describes the device observation. `received_at` describes when the API accepted it. Comparing `received_at` to the freshness threshold avoids treating a device that stopped communicating as current merely because its last measurement timestamp is recent.

## Why both application checks and database constraints exist

The API produces useful JSON errors and enforces role rules. The unique index and triggers remain a last line of defence if another process connects to the database or two ingestion requests race.

## Why jurisdiction is applied before pagination

Counting all rows and filtering afterward would leak the size of another province or district. The scope joins are part of the database query used by `findAndCountAll`, so both returned rows and totals are already authorised.

## Why the summary can return null

Adding fresh power to stale or missing installations as zero creates a plausible but false national number. The summary therefore gives a complete total only when every installation has a fresh latest value, and exposes a fresh partial sum plus coverage counters otherwise.

## Why local midnight is explicit

Sri Lankan reporting days are not UTC dates. The API converts the as-of time to `Asia/Colombo`, finds local midnight, converts that boundary back to UTC, and requires a pre-midnight cumulative baseline. A missing baseline is reported rather than guessed.

## What the JWT strategy does not prove

An authenticated device proves possession of its configured secret. It does not prove that the physical meter is accurate, that the device is at the claimed site, or that the measurement is truthful. Those require operational controls and independent validation.
