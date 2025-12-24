📄 MVP Specification — Quiz-Based Product Recommendation Platform
=================================================================

**Project:** Quiz-Based Product Recommendation Website (MVP)**Developer:** DSGNR Labs – Riyan**Date:** 23.12.2025**Status:** MVP Scope Frozen

1\. MVP DEFINITION OF DONE
--------------------------

The MVP is considered **complete** when all of the following are true:

*   Users can select a category (**Smartphones** or **TVs**)
    
*   Users can complete a **5–7 question quiz** per category, including **“No preference”** options
    
*   The system returns **Top 3 ranked product recommendations**, each showing:
    
    *   Compatibility score (%)
        
    *   Short explanation of _why_ it was recommended
        
    *   Warranty information
        
    *   Affiliate outbound links
        
*   Email is captured during the quiz flow
    
*   A **results email** is automatically sent containing recommendations
    
*   An admin user can:
    
    *   Add / edit / remove products
        
    *   Edit quiz questions and weightings safely
        
*   The website is deployed publicly with:
    
    *   Landing page
        
    *   Quiz flow
        
    *   Results page
        
    *   Product catalogue
        
    *   Legal placeholders
        

**The MVP is NOT complete if:**

*   Any quiz path crashes
    
*   Results differ for the same inputs
    
*   Email sending fails silently
    
*   Affiliate links are missing or hidden
    

2\. PRODUCT CATEGORIES (MVP)
----------------------------

### Included

*   Smartphones
    
*   Televisions (TVs)
    

### Excluded

*   All other product categories (Phase 2 only)
    

3\. QUIZ STRUCTURE
------------------

### General Rules

*   5–7 questions per category
    
*   Single-select questions only
    
*   Every question includes **“No preference”**
    
*   “No preference” must NOT penalise scoring
    

### 3.1 SMARTPHONE QUIZ QUESTIONS

#### Q1 — Budget

*   type: single\_select
    
*   options:
    
    *   £0–£300
        
    *   £300–£600
        
    *   £600–£900
        
    *   £900+
        
    *   No preference
        
*   maps\_to: price\_band
    
*   weight: 0.25
    

#### Q2 — Camera Importance

*   options:
    
    *   Very important
        
    *   Somewhat important
        
    *   Not important
        
    *   No preference
        
*   maps\_to: camera\_fit
    
*   weight: 0.15
    

#### Q3 — Battery Life Importance

*   options:
    
    *   Very important
        
    *   Somewhat important
        
    *   Not important
        
    *   No preference
        
*   maps\_to: battery\_fit
    
*   weight: 0.15
    

#### Q4 — Performance / Speed

*   options:
    
    *   Heavy use (gaming, multitasking)
        
    *   Moderate use
        
    *   Basic use
        
    *   No preference
        
*   maps\_to: performance\_fit
    
*   weight: 0.15
    

#### Q5 — Screen Size Preference

*   options:
    
    *   Small
        
    *   Medium
        
    *   Large
        
    *   No preference
        
*   maps\_to: screen\_size\_fit
    
*   weight: 0.10
    

#### Q6 — Brand Preference

*   options:
    
    *   Apple
        
    *   Samsung
        
    *   Google
        
    *   Other / No preference
        
*   maps\_to: brand\_fit
    
*   weight: 0.10
    

#### Q7 — Warranty Importance

*   options:
    
    *   Very important
        
    *   Somewhat important
        
    *   Not important
        
    *   No preference
        
*   maps\_to: warranty\_fit
    
*   weight: 0.10
    

### 3.2 TV QUIZ QUESTIONS

#### Q1 — Budget

*   options:
    
    *   £0–£500
        
    *   £500–£1,000
        
    *   £1,000–£2,000
        
    *   £2,000+
        
    *   No preference
        
*   maps\_to: price\_band
    
*   weight: 0.25
    

#### Q2 — Screen Size

*   options:
    
    *   Under 50"
        
    *   50"–65"
        
    *   65"+
        
    *   No preference
        
*   maps\_to: screen\_size\_fit
    
*   weight: 0.15
    

#### Q3 — Room Brightness / HDR

*   options:
    
    *   Very bright room
        
    *   Normal lighting
        
    *   Dark room
        
    *   No preference
        
*   maps\_to: brightness\_fit
    
*   weight: 0.15
    

#### Q4 — Gaming Features

*   options:
    
    *   Very important (120Hz / VRR)
        
    *   Somewhat important
        
    *   Not important
        
    *   No preference
        
*   maps\_to: gaming\_fit
    
*   weight: 0.15
    

#### Q5 — Smart TV OS Preference

*   options:
    
    *   Google TV
        
    *   Tizen
        
    *   webOS
        
    *   No preference
        
*   maps\_to: os\_fit
    
*   weight: 0.10
    

#### Q6 — Brand Preference

*   options:
    
    *   Samsung
        
    *   LG
        
    *   Sony
        
    *   Other / No preference
        
*   maps\_to: brand\_fit
    
*   weight: 0.10
    

#### Q7 — Warranty Importance

*   options:
    
    *   Very important
        
    *   Somewhat important
        
    *   Not important
        
    *   No preference
        
*   maps\_to: warranty\_fit
    
*   weight: 0.10
    

4\. RECOMMENDATION LOGIC (FROZEN)
---------------------------------

### 4.1 Scoring Dimensions

Each product has pre-defined attributes mapped to:

*   price\_fit
    
*   camera\_fit (phones)
    
*   battery\_fit (phones)
    
*   performance\_fit
    
*   screen\_size\_fit
    
*   brand\_fit
    
*   warranty\_fit
    
*   brightness\_fit (TVs)
    
*   gaming\_fit (TVs)
    
*   os\_fit (TVs)
    

### 4.2 Scoring Rules

*   Each answer maps to a numeric score per dimension (0.0 → 1.0)
    
*   Adjacent matches may score partially (e.g. 0.5)
    
*   “No preference” = **neutral** (does not boost or penalise)
    

### 4.3 Formula

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   total_score = Σ (dimension_score × dimension_weight)  compatibility_percent = round((total_score / max_possible_score) × 100)   `

### 4.4 Tie-Breakers (in order)

1.  Higher price\_fit
    
2.  Higher warranty\_fit (if warranty importance ≠ “Not important”)
    
3.  Higher performance\_fit
    
4.  Alphabetical fallback
    

5\. PRODUCT DATA REQUIREMENTS
-----------------------------

### 5.1 Shared Fields (All Products)

*   id
    
*   category
    
*   brand
    
*   model
    
*   price\_band
    
*   affiliate\_links (json)
    
*   warranty\_text
    
*   specs (json)
    
*   is\_active
    

### 5.2 Smartphone Required Specs

*   camera\_tier (1–5)
    
*   battery\_tier (1–5)
    
*   performance\_tier (1–5)
    
*   screen\_size\_band (small / medium / large)
    
*   warranty\_months
    

### 5.3 TV Required Specs

*   screen\_size\_inches
    
*   panel\_type (LED / QLED / OLED / MiniLED)
    
*   refresh\_rate (60 / 120)
    
*   vrr (true / false)
    
*   hdr\_tier (1–5)
    
*   os
    
*   warranty\_months
    

6\. EMAIL & TRACKING
--------------------

### Email Capture

*   email (required)
    
*   first\_name (optional)
    

### Results Email Must Include

*   Top 3 recommended products
    
*   Compatibility %
    
*   Affiliate links
    
*   Short explanation text
    

### Tracking

*   Store UTM parameters:
    
    *   utm\_source
        
    *   utm\_campaign
        
    *   utm\_medium
        
    *   utm\_content
        
    *   utm\_term
        

7\. AI USAGE (STRICT)
---------------------

### Included

*   Natural-language explanation of:
    
    *   Why products were recommended
        
    *   How preferences influenced results
        

### Excluded

*   ML models
    
*   Training data
    
*   Predictive or adaptive logic
    

AI **never** influences ranking.

8\. OUT OF SCOPE (HARD FENCES)
------------------------------

*   Live price syncing
    
*   Automated product APIs
    
*   Additional categories
    
*   SEO content creation
    
*   Advanced AI / ML
    
*   Ongoing maintenance
    
*   Affiliate approval guarantees
    
*   Extended warranty analysis
    

9\. MVP PRIORITY ORDER
----------------------

1.  Recommendation logic
    
2.  Product data structure
    
3.  Quiz → Results flow
    
4.  Email delivery
    
5.  Admin CRUD
    
6.  UI polish
    
7.  Deployment
    

FINAL NOTE
----------

This document is **frozen for MVP delivery**.Any additions beyond this scope are **Phase 2**.