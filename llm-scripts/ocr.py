import easyocr
import tempfile
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image
import io
import numpy as np

# Initialize reader lazily
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['en'])
    return _reader


def extract_text_from_pdf(file_bytes: bytes, language: list = None) -> dict:
    """
    Extract text from PDF using easyocr
    
    Args:
        file_bytes: PDF file content as bytes
        language: List of language codes (default: ['en'])
    
    Returns:
        Dictionary with extracted text and metadata
    """
    if language is None:
        language = ['en']
    
    try:
        # Get reader instance
        reader = get_reader()
        
        # Open PDF from bytes
        pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
        total_pages = len(pdf_document)
        
        all_text = []
        page_data = []
        
        # Process each page
        for page_num in range(total_pages):
            page = pdf_document[page_num]
            
            # Convert page to image
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            image_data = pix.tobytes("ppm")
            image = Image.open(io.BytesIO(image_data))
            
            # Convert PIL Image to numpy array for easyocr
            img_array = np.array(image)
            
            # Extract text using easyocr
            results = reader.readtext(img_array)
            
            page_text = "\n".join([text[1] for text in results])
            all_text.append(page_text)
            
            page_data.append({
                "page": page_num + 1,
                "text": page_text,
                "confidence": [float(text[2]) for text in results]
            })
        
        pdf_document.close()
        
        return {
            "status": "success",
            "total_pages": total_pages,
            "extracted_text": "\n\n---PAGE BREAK---\n\n".join(all_text),
            "pages": page_data
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


def extract_text_from_image(file_bytes: bytes, language: list = None) -> dict:
    """
    Extract text from image using easyocr
    
    Args:
        file_bytes: Image file content as bytes
        language: List of language codes (default: ['en'])
    
    Returns:
        Dictionary with extracted text and confidence scores
    """
    if language is None:
        language = ['en']
    
    try:
        # Get reader instance
        reader = get_reader()
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(file_bytes))
        
        # Convert PIL Image to numpy array for easyocr
        img_array = np.array(image)
        
        # Extract text using easyocr
        results = reader.readtext(img_array)
        
        extracted_data = [
            {
                "text": text[1],
                "confidence": float(text[2]),
                "bbox": text[0]
            }
            for text in results
        ]
        
        full_text = "\n".join([item["text"] for item in extracted_data])
        
        return {
            "status": "success",
            "full_text": full_text,
            "extracted_data": extracted_data,
            "total_text_blocks": len(extracted_data)
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
