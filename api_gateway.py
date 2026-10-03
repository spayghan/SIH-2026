from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uuid
import datetime

# Import our workers and rule engine
from mock_workers import (
    ocr_vision_extraction_worker, 
    barcode_registry_worker, 
    government_registry_worker
)
from rule_engine import evaluate_compliance

app = FastAPI(
    title="Legal Metrology API Gateway",
    description="Phase 2 & 3: Project-Owned FastAPI Gateway and Dispatcher",
    version="2.1"
)

# Allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------
class CompliancePayload(BaseModel):
    inspection_id: str
    barcode: str
    extracted_mrp: float
    fssai_detected: bool
    net_weight: str

# ---------------------------------------------------------
# PHASE 2 & 3: GATEWAY ENDPOINTS
# ---------------------------------------------------------

@app.post("/verify-product", summary="Phase 3: Dispatch to External Adapters")
async def verify_product(
    barcode: str = Form(...),
    gstin: str = Form(...),
    fssai_lic: str = Form(...)
):
    """
    Simulates dispatching data to External Registries (GST/FSSAI).
    """
    registry_data = government_registry_worker(gstin, fssai_lic)
    
    return {
        "status": "VERIFICATION_COMPLETE",
        "government_registries": registry_data
    }

@app.post("/scan-product", status_code=202, summary="Phase 2: Ingest Images & Metadata")
async def scan_product(
    barcode: str = Form(...),
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...)
):
    """
    Receives the images and barcode from the inspector's device.
    Returns HTTP 202 (Accepted) to simulate asynchronous queue dispatching.
    """
    inspection_id = f"INSP-{uuid.uuid4().hex[:8].upper()}"
    
    return {
        "message": "Images and metadata received. Queued for processing.",
        "inspection_id": inspection_id,
        "barcode_received": barcode,
        "status": "PENDING_PROCESSING",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@app.post("/extract-label", summary="Phase 4: Dispatch to OCR & Vision Worker")
async def extract_label(
    barcode: str = Form(...),
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...)
):
    """
    Reads the actual image bytes and dispatches them to the Gemini-powered OCR/Vision worker,
    including the target barcode for context.
    """
    front_bytes = await front_image.read()
    back_bytes = await back_image.read()
    
    front_mime = front_image.content_type or "image/jpeg"
    back_mime = back_image.content_type or "image/jpeg"

    # Dispatch to the REAL Gemini AI Worker with all required arguments including barcode
    extracted_data = ocr_vision_extraction_worker(
        front_bytes, back_bytes, front_mime, back_mime, barcode=barcode
    )
    
    return {
        "status": "EXTRACTION_COMPLETE",
        "extracted_data": extracted_data
    }

@app.post("/check-compliance", summary="Phase 5: Deterministic Rule Engine")
async def check_compliance(payload: dict):
    # Fetch reference data
    barcode = payload.get("barcode")
    reference_data = barcode_registry_worker(barcode)
    
    # Fetch external registry validation results (simulated or real from payload)
    gstin = payload.get("gstin", "27AADCB2230M1Z4")
    fssai_lic = payload.get("fssai_lic", "10020042001234")
    registry_checks = government_registry_worker(gstin, fssai_lic)

    verdict = evaluate_compliance(
        extracted_mrp=payload.get("extracted_mrp"),
        true_mrp=reference_data["true_mrp"],
        fssai_detected=payload.get("fssai_detected"),
        fssai_required=reference_data["fssai_required"],
        gstin_verified=registry_checks["gstin_status"]["verified"],
        fssai_verified=registry_checks["fssai_status"]["verified"],
        extracted_fssai_lic=fssai_lic,
        registered_fssai_lic=reference_data["registered_fssai_lic"]
    )
    
    return {"inspection_id": payload.get("inspection_id"), "rule_engine_verdict": verdict}

@app.post("/generate-report", summary="Phase 7: Generate Challan Metadata")
async def generate_report(inspection_id: str = Form(...)):
    """
    Confirms the generation of the PDF Challan. 
    (The actual PDF blob is generated client-side via jsPDF for the prototype).
    """
    return {
        "status": "CHALLAN_DRAFTED",
        "inspection_id": inspection_id,
        "message": "Official Legal Notice drafted successfully. Awaiting Inspector Signature.",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# ---------------------------------------------------------
# SERVE FRONTEND (Phase 1 & 7)
# ---------------------------------------------------------
app.mount("/public", StaticFiles(directory="public"), name="public")

@app.get("/")
async def serve_frontend():
    return FileResponse("public/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)