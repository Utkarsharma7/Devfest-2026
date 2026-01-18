from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ocr import extract_text_from_pdf, extract_text_from_image

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (you can restrict this to specific URLs like ["http://localhost:3000"])
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


@app.post("/ocr/pdf")
async def ocr_pdf(file: UploadFile = File(...)):
    """
    Extract text from PDF using OCR
    
    Args:
        file: PDF file upload
    
    Returns:
        Dictionary with extracted text and page-wise data
    """
    try:
        content = await file.read()
        result = extract_text_from_pdf(content)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/ocr/image")
async def ocr_image(file: UploadFile = File(...)):
    """
    Extract text from image using OCR
    
    Args:
        file: Image file upload (jpg, png, etc.)
    
    Returns:
        Dictionary with extracted text and confidence scores
    """
    try:
        content = await file.read()
        result = extract_text_from_image(content)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}
