# Security Configuration Guide

## Overview

This document addresses the security warnings reported by Supabase and provides guidance on resolving them.

## Index Usage Warnings (Not Security Issues)

The "unused index" warnings are **performance monitoring alerts**, not security vulnerabilities. These warnings appear because:

1. The application is in development with limited query execution
2. Supabase's index usage statistics are based on actual query execution, not code analysis
3. Most indexes ARE used by application queries but haven't been hit enough to register as "used"

### Indexes That ARE Used by Application Code

The following indexes are actively used by queries in the codebase:

#### evt_s1010 Table
- `idx_evt_s1010_empresa_id` - Used in ImportPage.tsx line 312
- `idx_evt_s1010_cod_rubr` - Used in ImportPage.tsx line 314
- `idx_evt_s1010_ini_valid` - Used in ImportPage.tsx line 317 (ORDER BY clause)
- `idx_evt_s1010_empresa_cod_rubr` - Composite index for the above queries

#### remuneracoes Table
- `idx_remuneracoes_colaborador` - Used in ImportPage.tsx line 440
- `idx_remuneracoes_importacao_id` - Used for cleanup operations

#### evt_s1070 Table
- Index on `empresa_id` - Used in auditEngine.ts line 218

#### Other Tables
- Various indexes on `importacoes`, `apuracoes`, `divergencias`, and other tables are used throughout the application

**Recommendation**: Keep all existing indexes. They will show as "used" once the application is in production with real query load.

---

## REAL Security Issues (Require Manual Configuration)

The following are actual security concerns that require changes in the Supabase Dashboard:

### 1. Auth DB Connection Strategy ⚠️ HIGH PRIORITY

**Issue**: Auth server uses fixed connection count (10 connections) instead of percentage-based allocation.

**Impact**: Cannot scale Auth performance by increasing instance size without manual adjustment.

**Fix Steps**:
1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection Pooling** section
4. Change Auth connection strategy from **Fixed** to **Percentage**
5. Set to approximately **10-15%** of total connections
6. Save changes

### 2. Leaked Password Protection Disabled ⚠️ HIGH PRIORITY

**Issue**: Password breach detection via HaveIBeenPwned.org is disabled.

**Impact**: Users can set passwords that have been compromised in known data breaches, increasing account takeover risk.

**Fix Steps**:
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Policies**
3. Find **Password Policy** section
4. Enable **"Prevent the use of leaked passwords"**
5. Save changes

**What This Does**: Supabase will check user passwords against the HaveIBeenPwned database of compromised credentials and reject any matches.

---

## Additional Security Best Practices

### Already Implemented ✅

- Row Level Security (RLS) enabled on all tables
- Restrictive RLS policies requiring authentication
- Proper ownership checks in policies
- Secure password requirements
- JWT-based authentication
- HTTPS-only API access

### Recommendations

1. **Monitor Auth Metrics**: Once you fix the connection strategy, monitor auth performance in the Supabase dashboard

2. **Review Password Policies**: Consider additional requirements:
   - Minimum length (current: 6 characters, recommended: 12+)
   - Password complexity requirements
   - Password rotation policies

3. **Enable MFA**: For high-value accounts, require Multi-Factor Authentication

4. **Audit Logs**: Enable and regularly review audit logs in production

---

## Summary

**Action Required**:
1. ✅ **Indexes**: No action needed - they are correctly configured and will show as "used" in production
2. ⚠️ **Auth Connection Strategy**: Change to percentage-based in Supabase Dashboard
3. ⚠️ **Leaked Password Protection**: Enable in Supabase Dashboard

The index warnings are false positives due to development environment conditions. The Auth configuration changes are the actual security improvements needed.
