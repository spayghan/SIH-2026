import datetime
import random
import shutil
import os
import re
from typing import List, Optional
from fastapi import FastAPI, Form, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fpdf import FPDF

from database import (
    INSPECTOR_DATA, 
    ADMIN_DATA, 
    INSPECTIONS_DB, 
    REGIONAL_RISK_DATA, 
    PRIORITY_AREAS
)
from mock_workers import ocr_vision_extraction_worker, barcode_registry_worker
from rule_engine import evaluate_compliance

app = FastAPI(
    title="Vyapar Nirikshan Portal - Enterprise MVP",
    description="Government Retail Inspection & Compliance Decision Support System with Multi-Violation Rule Engine",
    version="3.0.5"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploaded_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)
CHALLAN_PDF_DIR = "generated_challans"
os.makedirs(CHALLAN_PDF_DIR, exist_ok=True)

# Mount public directory to serve index.html directly
if os.path.exists("public"):
    app.mount("/public", StaticFiles(directory="public"), name="public")

@app.get("/")
def serve_frontend():
    index_path = os.path.join(os.path.dirname(__file__), "public", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "index.html not found in public folder. Please check path."}


# ==========================================
# VALIDATION UTILITIES (GSTIN & FSSAI)
# ==========================================
def validate_gstin_format(gstin: str) -> bool:
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    return bool(re.match(pattern, gstin.upper()))

def validate_fssai_format(fssai: str) -> bool:
    pattern = r"^[0-9]{14}$"
    return bool(re.match(pattern, fssai))

# CRASH-PROOF TEXT SANITIZER FOR FPDF
def safe_text(text: any) -> str:
    if not text: return "N/A"
    text = str(text)
    text = text.replace("Rs. ", "Rs. ").replace("₹", "Rs. ")
    text = text.replace("—", "-").replace("–", "-")
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("”", '"').replace("“", '"')
    return text.encode('latin-1', 'replace').decode('latin-1')

# ==========================================
# WORKER / BACKGROUND PROCESSING LOGIC
# ==========================================
def process_inspection_with_ai_worker(inspection_id: str):
    if inspection_id not in INSPECTIONS_DB:
        return
    
    inspection = INSPECTIONS_DB[inspection_id]
    
    try:
        front_path = inspection.get("front_image")
        back_path = inspection.get("back_image")
        barcode = inspection.get("barcode", "")
        
        front_bytes, back_bytes = b"", b""
        if front_path and os.path.exists(front_path):
            with open(front_path, "rb") as f:
                front_bytes = f.read()
        if back_path and os.path.exists(back_path):
            with open(back_path, "rb") as f:
                back_bytes = f.read()

        # 1. Dynamic AI Vision / OCR Worker (Gemini)
        extracted_data = ocr_vision_extraction_worker(
            front_bytes=front_bytes,
            back_bytes=back_bytes,
            front_mime="image/jpeg",
            back_mime="image/jpeg",
            barcode=barcode
        )

        extracted_mrp = float(extracted_data.get("extracted_mrp", 0.0))
        fssai_detected = bool(extracted_data.get("fssai_logo_detected", False))
        product_name = extracted_data.get("product_name", "Packaged Commodity")
        is_expired = bool(extracted_data.get("is_expired", False))
        expiry_date_found = extracted_data.get("expiry_date_found", "Unknown")
        extracted_fssai_lic = extracted_data.get("extracted_fssai_lic")

        # 2. Reference Database Lookup
        ref_data = barcode_registry_worker(barcode)
        true_mrp = ref_data["true_mrp"]
        fssai_required = ref_data["fssai_required"]
        registered_fssai_lic = ref_data["registered_fssai_lic"]

        # GST/FSSAI Booleans
        gstin_verified = (inspection["gst_verification_status"] == "Verified")
        fssai_verified = (inspection["fssai_verification_status"] == "Verified")

        # 3. Deterministic Multi-Violation Rule Engine Evaluation
        verdict = evaluate_compliance(
            extracted_mrp=extracted_mrp,
            true_mrp=true_mrp,
            fssai_detected=fssai_detected,
            fssai_required=fssai_required,
            gstin_verified=gstin_verified,
            fssai_verified=fssai_verified,
            extracted_fssai_lic=extracted_fssai_lic,
            registered_fssai_lic=registered_fssai_lic,
            is_expired=is_expired,
            expiry_date_found=expiry_date_found
        )

        inspection["product_category"] = f"{product_name} (AI Verified)"
        inspection["status"] = "Failed" if verdict["status"] == "FAIL" else "Passed"
        inspection["violations"] = verdict["violations_flagged"]
        inspection["total_penalty"] = verdict.get("total_calculated_penalty", "Rs. 0")
        
    except Exception as e:
        print(f"Worker Error: {str(e)}")
        inspection["status"] = "Failed"
        inspection["violations"] = [{
            "violation_name": "System Processing Error",
            "law": "Administrative",
            "section": "N/A",
            "reason": "Could not process image evidence automatically. Manual review required.",
            "evidence": "N/A",
            "fine": "Rs. 1,000"
        }]

# ==========================================
# PDF GENERATOR (FPDF2)
# ==========================================
def generate_official_challan_pdf(challan_data: dict, output_path: str):
    pdf = FPDF()
    pdf.add_page()
    
    # Header Banner Styling
    pdf.set_fill_color(30, 58, 138)
    pdf.rect(0, 0, 210, 28, 'F')
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 14)
    pdf.set_xy(10, 8)
    pdf.cell(190, 6, "GOVERNMENT OF INDIA", 0, 1, "C")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(190, 5, "MINISTRY OF CONSUMER AFFAIRS - DEPARTMENT OF LEGAL METROLOGY", 0, 1, "C")
    
    # Document Title
    pdf.set_text_color(15, 23, 42)
    pdf.set_y(35)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(190, 8, "OFFICIAL NOTICE OF OFFENCE / E-CHALLAN", 0, 1, "C")
    
    pdf.ln(5)
    
    # Metadata Box
    pdf.set_font("helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249)
    pdf.cell(95, 6, safe_text(f" Challan ID: {challan_data.get('challan_id')}"), 1, 0, "L", True)
    pdf.cell(95, 6, safe_text(f" Date & Time: {challan_data.get('date')}"), 1, 1, "L", True)
    pdf.cell(95, 6, safe_text(f" Inspection ID: {challan_data.get('inspection_id')}"), 1, 0, "L", True)
    pdf.cell(95, 6, safe_text(f" Inspecting Officer: {challan_data.get('inspector')}"), 1, 1, "L", True)
    
    pdf.ln(4)
    
    # Establishment Block
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(190, 6, "1. ESTABLISHMENT & REGISTRATION VERIFICATION", 0, 1, "L")
    pdf.set_font("helvetica", "", 9)
    pdf.cell(95, 6, safe_text(f"Establishment: {challan_data.get('shop_name')}"), 1, 0, "L")
    pdf.cell(95, 6, safe_text(f"GSTIN Status: {challan_data.get('gst_verification_status')} ({challan_data.get('gstin')})"), 1, 1, "L")
    pdf.cell(95, 6, safe_text(f"Address: {challan_data.get('address')}"), 1, 0, "L")
    pdf.cell(95, 6, safe_text(f"FSSAI Status: {challan_data.get('fssai_verification_status')} ({challan_data.get('fssai_number')})"), 1, 1, "L")
    
    pdf.ln(4)
    
    # Violations Block
    violations_list = challan_data.get('violations', [])
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(190, 6, safe_text(f"2. RECORDED VIOLATIONS ({len(violations_list)} Detected)"), 0, 1, "L")
    
    for idx, v in enumerate(violations_list):
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(190, 6, safe_text(f"VIOLATION {idx + 1}: {v.get('violation_name')}"), 1, 1, "L", True)
        pdf.set_font("helvetica", "", 9)
        desc = safe_text(f"Law/Act: {v.get('law')}\nSection/Rule: {v.get('section')}\nDescription: {v.get('reason')}\nFine/Penalty: {v.get('fine')}")
        pdf.multi_cell(190, 5, desc, 1, "L")
        pdf.ln(2)
        
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(190, 6, safe_text(f"TOTAL PENALTY AMOUNT: {challan_data.get('total_penalty')}"), 1, 1, "C", True)
    
    pdf.ln(4)
    
    # Inspector Approval Stamp
    pdf.set_font("helvetica", "B", 9)
    pdf.cell(190, 6, "3. INSPECTOR REVIEW & APPROVAL RECORD", 0, 1, "L")
    pdf.set_font("helvetica", "", 9)
    pdf.cell(95, 6, safe_text(f"Approval Status: {challan_data.get('approval_status')}"), 1, 0, "L")
    pdf.cell(95, 6, safe_text(f"Approval Timestamp: {challan_data.get('approval_timestamp')}"), 1, 1, "L")
    
    pdf.ln(4)
    
    # Evidence Section
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(190, 6, "4. PRODUCT EVIDENCE CAPTURES", 0, 1, "L")
    
    img_y = pdf.get_y()
    front_img = challan_data.get('front_image')
    back_img = challan_data.get('back_image')
    
    if front_img and os.path.exists(front_img):
        try:
            pdf.image(front_img, x=15, y=img_y, w=80)
            pdf.set_xy(15, img_y + 42)
            pdf.set_font("helvetica", "I", 8)
            pdf.cell(80, 5, "Evidence - Product Front", 0, 0, "C")
            pdf.set_xy(10, img_y + 50)
        except Exception:
            pass
            
    if back_img and os.path.exists(back_img):
        try:
            pdf.image(back_img, x=115, y=img_y, w=80)
            pdf.set_xy(115, img_y + 42)
            pdf.set_font("helvetica", "I", 8)
            pdf.cell(80, 5, "Evidence - Product Back", 0, 0, "C")
        except Exception:
            pass
            
    pdf.output(output_path)


# ==========================================
# AUTHENTICATION APIs
# ==========================================
@app.post("/auth/inspector-login")
def inspector_login(inspector_id: str = Form(...), password: str = Form(...)):
    if inspector_id == INSPECTOR_DATA["inspector_id"] and password == INSPECTOR_DATA["password"]:
        return {"success": True, "message": "Inspector login successful", "role": "Inspector", "user": INSPECTOR_DATA}
    raise HTTPException(status_code=401, detail="Invalid Inspector ID or Password")

@app.post("/auth/admin-login")
def admin_login(admin_id: str = Form(...), password: str = Form(...)):
    if admin_id == ADMIN_DATA["admin_id"] and password == ADMIN_DATA["password"]:
        return {"success": True, "message": "Administrator login successful", "role": "Administrator", "user": ADMIN_DATA}
    raise HTTPException(status_code=401, detail="Invalid Administrator ID or Password")

# ==========================================
# INSPECTOR APIs
# ==========================================
@app.get("/inspector/profile")
def get_inspector_profile():
    return {"success": True, "data": INSPECTOR_DATA}

@app.get("/inspector/history")
def get_inspector_history():
    records = [{
        "inspection_id": data["inspection_id"],
        "shop_name": data["shop_name"],
        "location": f"{data['address']}, {data['district']}",
        "date": data["date"],
        "status": data["status"]
    } for data in INSPECTIONS_DB.values()]
    return {"success": True, "data": records}

@app.post("/inspections")
def create_inspection(
    shop_name: str = Form(...),
    owner_name: str = Form(...),
    mobile_number: str = Form(...),
    address: str = Form(...),
    district: str = Form(...),
    state: str = Form(...),
    product_category: str = Form(...),
    gst_number: str = Form(...),
    fssai_license_number: str = Form(...),
    barcode: str = Form(...)
):
    gst_valid = validate_gstin_format(gst_number)
    fssai_valid = validate_fssai_format(fssai_license_number)
    
    gst_status = "Verified" if gst_valid else "Invalid"
    fssai_status = "Verified" if fssai_valid else "Invalid"

    inspection_id = f"INSP-2026-{random.randint(100, 999)}"
    
    new_inspection = {
        "inspection_id": inspection_id,
        "shop_name": shop_name,
        "owner_name": owner_name,
        "mobile_number": mobile_number,
        "address": address,
        "district": district,
        "state": state,
        "product_category": product_category,
        "gst_number": gst_number,
        "gst_verification_status": gst_status,
        "fssai_license_number": fssai_license_number,
        "fssai_verification_status": fssai_status,
        "barcode": barcode,
        "inspector_id": INSPECTOR_DATA["inspector_id"],
        "inspector_name": INSPECTOR_DATA["name"],
        "status": "Processing",
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "front_image": None,
        "back_image": None,
        "violations": [],
        "inspector_reviewed": False,
        "inspector_approval_status": "Pending Review",
        "approval_timestamp": None,
        "challan": None
    }
    
    INSPECTIONS_DB[inspection_id] = new_inspection
    
    return {
        "success": True,
        "message": "Establishment initialized.",
        "inspection_id": inspection_id,
        "gst_status": gst_status,
        "fssai_status": fssai_status
    }

@app.post("/inspections/{inspection_id}/products")
async def upload_inspection_products(
    inspection_id: str,
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...)
):
    if inspection_id not in INSPECTIONS_DB:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    
    front_path = os.path.join(UPLOAD_DIR, f"{inspection_id}_front.jpg")
    back_path = os.path.join(UPLOAD_DIR, f"{inspection_id}_back.jpg")
    
    with open(front_path, "wb") as buffer:
        shutil.copyfileobj(front_image.file, buffer)
    with open(back_path, "wb") as buffer:
        shutil.copyfileobj(back_image.file, buffer)
    
    inspection = INSPECTIONS_DB[inspection_id]
    inspection["front_image"] = front_path
    inspection["back_image"] = back_path
    
    return {"success": True, "message": "Images attached."}

@app.post("/inspections/{inspection_id}/verify")
def trigger_inspection_verification(inspection_id: str, background_tasks: BackgroundTasks):
    if inspection_id not in INSPECTIONS_DB:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    
    background_tasks.add_task(process_inspection_with_ai_worker, inspection_id)
    return {"success": True, "message": "Rule Engine Worker triggered.", "status": "Processing"}

@app.get("/inspections/{inspection_id}/result")
def get_inspection_result(inspection_id: str):
    if inspection_id not in INSPECTIONS_DB:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    return {"success": True, "data": INSPECTIONS_DB[inspection_id]}

@app.post("/inspections/{inspection_id}/review")
def inspector_review_approval(inspection_id: str, action: str = Form(...)):
    if inspection_id not in INSPECTIONS_DB:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    
    inspection = INSPECTIONS_DB[inspection_id]
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    inspection["inspector_reviewed"] = True
    
    if action.lower() == "approve":
        inspection["inspector_approval_status"] = "Approved"
        inspection["approval_timestamp"] = timestamp
        
        if inspection["status"] == "Failed" and len(inspection.get("violations", [])) > 0:
            rand_num = random.randint(1, 999999)
            challan_id = f"CHL-2026-{rand_num:06d}"
            
            challan_data = {
                "challan_id": challan_id,
                "inspection_id": inspection_id,
                "shop_name": inspection["shop_name"],
                "owner_name": inspection["owner_name"],
                "address": f"{inspection['address']}, {inspection['district']}",
                "gstin": inspection["gst_number"],
                "gst_verification_status": inspection["gst_verification_status"],
                "fssai_number": inspection["fssai_license_number"],
                "fssai_verification_status": inspection["fssai_verification_status"],
                "inspector": f"{INSPECTOR_DATA['name']} ({INSPECTOR_DATA['inspector_id']})",
                "date": timestamp,
                "violations": inspection["violations"],
                "total_penalty": inspection.get("total_penalty", "Rs. 0"),
                "approval_status": "Approved by Inspector",
                "approval_timestamp": timestamp,
                "front_image": inspection.get("front_image"),
                "back_image": inspection.get("back_image"),
                "remarks": "Compoundable offences under Legal Metrology provisions."
            }
            inspection["challan"] = challan_data
            
            # Generate actual PDF file
            pdf_path = os.path.join(CHALLAN_PDF_DIR, f"{challan_id}.pdf")
            generate_official_challan_pdf(challan_data, pdf_path)
            
        return {"success": True, "message": "Violations approved successfully. Official E-Challan generated.", "data": inspection}
    else:
        inspection["inspector_approval_status"] = "Rejected / Sent Back"
        inspection["approval_timestamp"] = timestamp
        inspection["status"] = "Passed"
        inspection["challan"] = None
        return {"success": True, "message": "Case rejected and sent back by inspector.", "data": inspection}

@app.get("/inspections/{inspection_id}/challan")
def get_inspection_challan(inspection_id: str):
    if inspection_id not in INSPECTIONS_DB:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    
    inspection = INSPECTIONS_DB[inspection_id]
    if not inspection.get("inspector_reviewed") or inspection["inspector_approval_status"] != "Approved":
        raise HTTPException(status_code=400, detail="Challan not available: Pending Inspector Review and Approval.")
        
    return {"success": True, "data": inspection["challan"]}

@app.get("/inspections/{inspection_id}/download-pdf")
def download_challan_pdf(inspection_id: str):
    inspection = INSPECTIONS_DB.get(inspection_id)
    if not inspection or not inspection.get("challan"):
        raise HTTPException(status_code=404, detail="Challan PDF not found.")
        
    challan = inspection["challan"]
    pdf_path = os.path.join(CHALLAN_PDF_DIR, f"{challan['challan_id']}.pdf")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"Official_Challan_{challan['challan_id']}.pdf")


# ==========================================
# ADMINISTRATOR APIs
# ==========================================
@app.get("/admin/dashboard")
def get_admin_dashboard():
    total = len(INSPECTIONS_DB) + 2840
    passed = sum(1 for d in INSPECTIONS_DB.values() if d["status"] == "Passed") + 1970
    failed = sum(1 for d in INSPECTIONS_DB.values() if d["status"] == "Failed") + 533
    pending = sum(1 for d in INSPECTIONS_DB.values() if d["status"] == "Processing") + 340
    return {"success": True, "kpis": {"total_inspections": total, "passed": passed, "failed": failed, "pending": pending, "high_risk_areas": 18}}

@app.get("/admin/regional-analysis")
def get_admin_regional_analysis():
    return {"success": True, "regional_risk_data": REGIONAL_RISK_DATA, "priority_areas": PRIORITY_AREAS}

@app.get("/admin/inspections")
def get_admin_inspections():
    records = []
    for inspection in INSPECTIONS_DB.values():
        records.append({
            "inspection_id": inspection["inspection_id"],
            "shop_name": inspection["shop_name"],
            "owner_name": inspection["owner_name"],
            "district": inspection["district"],
            "date": inspection["date"],
            "status": inspection["status"],
            "inspector_id": inspection["inspector_id"],
            "inspector_name": inspection["inspector_name"],
            "violations_count": len(inspection.get("violations", [])),
            "approval_status": inspection.get("inspector_approval_status", "Pending Review")
        })
    records.sort(key=lambda item: item["date"], reverse=True)
    return {"success": True, "data": records}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)