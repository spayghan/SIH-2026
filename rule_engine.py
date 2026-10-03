# ==============================================================================
# PHASE 5: DETERMINISTIC MULTI-VIOLATION RULE ENGINE
# ==============================================================================

def evaluate_compliance(
    extracted_mrp: float,
    true_mrp: float,
    fssai_detected: bool,
    fssai_required: bool,
    gstin_verified: bool,
    fssai_verified: bool,
    extracted_fssai_lic: str = None,
    registered_fssai_lic: str = None,
    is_expired: bool = False,
    expiry_date_found: str = None
) -> dict:
    """
    Evaluates extracted product data against legal metrology rules and baseline registries.
    Returns a structured verdict containing all flagged violations and total calculated fines.
    """
    violations = []

    # 1. Check MRP Overcharging / Tampering (Dynamic Comparison)
    if extracted_mrp > true_mrp:
        discrepancy = round(extracted_mrp - true_mrp, 2)
        violations.append({
            "violation_name": "MRP Overcharging / Tampering",
            "law": "Legal Metrology Act, 2009",
            "section": "Section 36(1)",
            "reason": f"Product MRP appears to have been altered. Printed price (Rs. {extracted_mrp}) exceeds registered price (Rs. {true_mrp}). Discrepancy of Rs. {discrepancy}.",
            "evidence": "Evidence - Product Front",
            "fine": "Rs. 5,000"
        })

    # 2. Check Mandatory FSSAI Declarations / Logo
    if fssai_required and not fssai_detected:
        violations.append({
            "violation_name": "Missing Mandatory Declaration",
            "law": "Legal Metrology (Packaged Commodities) Rules, 2011",
            "section": "Rule 6(1)",
            "reason": "Mandatory FSSAI safety logo is missing from packaging.",
            "evidence": "Evidence - Product Back",
            "fine": "Rs. 10,000"
        })

    # 3. Check Expiry Status
    if is_expired:
        violations.append({
            "violation_name": "Sale of Expired Commodity",
            "law": "Food Safety and Standards Act / Consumer Protection Act",
            "section": "Section 26 (FSSAI)",
            "reason": f"Product expiry date found as '{expiry_date_found}', which indicates stock has expired.",
            "evidence": "Evidence - Product Back",
            "fine": "Rs. 15,000"
        })

    # 4. Check Registry Verification Anomalies
    if not gstin_verified:
        violations.append({
            "violation_name": "Invalid GSTIN Registration",
            "law": "Central Goods and Services Tax Act, 2017",
            "section": "Section 25",
            "reason": "Establishment GSTIN provided failed external registry structure validation.",
            "evidence": "Establishment Profile",
            "fine": "Rs. 5,000"
        })

    # Calculate total penalty sum string format dynamically
    total_fine_value = 0
    for v in violations:
        digits_only = "".join([char for char in v["fine"] if char.isdigit()])
        if digits_only:
            total_fine_value += int(digits_only)

    return {
        "status": "FAIL" if len(violations) > 0 else "PASS",
        "violations_flagged": violations,
        "total_calculated_penalty": f"Rs. {total_fine_value:,}"
    }