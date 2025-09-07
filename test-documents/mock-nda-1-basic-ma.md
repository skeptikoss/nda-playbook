# Mock NDA #1: Basic M&A Due Diligence Agreement

## Test Document Purpose
- **Scenario**: Private equity firm acquiring Singapore manufacturing company
- **Expected Party**: Receiving (PE firm receiving confidential information)
- **Test Focus**: Standard M&A due diligence clause patterns

---

## NON-DISCLOSURE AGREEMENT

**PARTIES**
- **Disclosing Party**: TechManufacturing Pte Ltd (Singapore manufacturing company)  
- **Receiving Party**: AsiaGrowth Capital Partners (private equity firm)

**RECITALS**
WHEREAS, Disclosing Party possesses certain proprietary and confidential business information relating to its manufacturing operations, financial performance, customer relationships, and strategic plans;

WHEREAS, Receiving Party desires to evaluate potential investment or acquisition opportunities;

NOW THEREFORE, the parties agree as follows:

### 1. DEFINITION OF CONFIDENTIAL INFORMATION

**[TEST: Should detect as BROAD definition - Not Acceptable for Receiving Party]**

"Confidential Information" shall mean any and all non-public, proprietary or confidential information, including without limitation: (a) all business, financial, technical, operational, marketing, customer, supplier, employee, and strategic information; (b) all data, documents, reports, analyses, compilations, forecasts, studies or other materials; (c) all information concerning the business affairs, properties, technologies, products, services, customers, suppliers, investors, personnel, compensation, sales, profits, markets, software, inventions, processes, formulae, technology, designs, drawings, engineering, hardware configuration information, marketing, finances, or other business information; and (d) all notes, analyses, compilations, studies, summaries or other material prepared by Receiving Party containing or reflecting any Confidential Information.

**[TEST: Should detect as broad scope favouring Disclosing Party]**

All information disclosed orally, visually, electronically, or in writing shall be deemed Confidential Information regardless of whether specifically marked or identified as confidential.

### 2. DURATION OF CONFIDENTIALITY OBLIGATIONS  

**[TEST: Should detect as LONG duration - Not Acceptable for Receiving Party]**

The obligations of Receiving Party shall continue in perpetuity and shall survive any termination of discussions between the parties. Receiving Party acknowledges that the competitive advantage and proprietary nature of Confidential Information requires permanent protection.

**[TEST: Should detect as perpetual/indefinite duration]**

### 3. GOVERNING LAW AND JURISDICTION

**[TEST: Should detect as Singapore jurisdiction - Starting Position for Singapore law firm]**

This Agreement shall be governed by and construed in accordance with the laws of Singapore. Any disputes arising under this Agreement shall be subject to the exclusive jurisdiction of the Singapore courts.

**[TEST: Should detect as exclusive Singapore jurisdiction]**

The parties hereby submit to the jurisdiction of Singapore and waive any objection to venue in Singapore courts.

---

## Expected Analysis Results

### For Receiving Party (PE Firm):
- **Definition**: Not Acceptable (too broad - should recommend narrower scope)
- **Duration**: Not Acceptable (perpetual - should recommend 3-5 years maximum)  
- **Governing Law**: Starting Position (Singapore jurisdiction appropriate)
- **Overall Score**: ~30-40% (major issues with definition and duration)

### For Disclosing Party (Target Company):
- **Definition**: Starting Position (broad protection as desired)
- **Duration**: Starting Position (perpetual protection ideal)
- **Governing Law**: Starting Position (Singapore jurisdiction fine)
- **Overall Score**: ~95% (excellent protection for discloser)

### For Mutual NDA:
- **Definition**: Fallback (too broad for mutual exchange)
- **Duration**: Not Acceptable (perpetual inappropriate for mutual)
- **Governing Law**: Starting Position (Singapore jurisdiction appropriate)
- **Overall Score**: ~60% (unbalanced favouring one party)