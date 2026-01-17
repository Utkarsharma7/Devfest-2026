from fastapi import FastAPI, UploadFile, File
from ocr import extract_text_from_pdf, extract_text_from_image

app = FastAPI()


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
