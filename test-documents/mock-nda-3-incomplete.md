# Mock NDA #3: Incomplete Agreement (Missing Clauses)

## Test Document Purpose
- **Scenario**: Hastily drafted vendor agreement with missing critical clauses
- **Expected Party**: Any (tests missing clause detection)
- **Test Focus**: Incomplete document to validate missing clause detection

---

## NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

**PARTIES**
- CloudServices Asia Pte Ltd (Service Provider)
- RegionalBank Singapore Ltd (Client)

**BACKGROUND**
RegionalBank requires cloud infrastructure services and CloudServices will have access to sensitive banking data during implementation.

### 1. CONFIDENTIAL INFORMATION

**[TEST: Should detect as PRESENT but analyse quality]**

The Service Provider acknowledges that during the provision of cloud services, it may have access to confidential information belonging to the Bank, including customer account information, transaction data, internal processes, and proprietary banking software configurations.

**[TEST: Should detect as informal definition - needs legal structure]**

Such information is considered highly sensitive and must be protected according to banking regulations and industry best practices.

### 2. USE RESTRICTIONS

**[NOT A TARGET CLAUSE - Should not interfere with detection]**

Service Provider agrees to use confidential information solely for the purpose of providing contracted cloud services and shall not use such information for any other business purpose.

### 3. RETURN OF INFORMATION  

**[NOT A TARGET CLAUSE - Red herring content]**

Upon termination of services, all confidential information and copies thereof shall be returned to RegionalBank within thirty (30) days.

---

## MISSING CLAUSES (Should be detected):

### MISSING: Duration of Confidentiality Obligations
**[TEST: System should flag as MISSING - no time limit specified]**
- No specific timeframe for how long confidentiality obligations continue
- Critical gap for banking compliance requirements

### MISSING: Governing Law and Jurisdiction  
**[TEST: System should flag as MISSING - no legal framework specified]**
- No governing law specified (critical for cross-border banking services)
- No jurisdiction clause for dispute resolution
- Regulatory compliance uncertainty

---

## Expected Analysis Results

### For Any Party Perspective:
- **Definition**: Present but informal (Fallback - needs legal structure)
- **Duration**: MISSING (should flag as critical gap)
- **Governing Law**: MISSING (should flag as critical gap)
- **Overall Score**: ~35% (major structural deficiencies)

### Missing Clause Recommendations:
- **Duration**: "Add specific confidentiality period (suggest 5-7 years for banking data)"
- **Governing Law**: "Specify Singapore law and jurisdiction for regulatory compliance"

### AI Suggestions Should Recommend:
- Legal restructuring of informal confidentiality definition
- Addition of specific duration clause appropriate for banking sector
- Inclusion of Singapore governing law for regulatory clarity