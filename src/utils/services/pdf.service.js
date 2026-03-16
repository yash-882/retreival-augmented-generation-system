import opError from "../classes/opError.class.js"

// removes encoded text like \n , \s
export const cleanPdfText = (pdfPages = ['defaultText']) => {

  return pdfPages.map(text => 
    text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    )
}

// validates extracted text of PDF
export const validatePdfResult = (pdfPages=[]) => {

  // if every page has no text
  if (pdfPages.every(page => page === '')) {
    throw new opError('No text found or invalid pdf', 400)
  }

  if (pdfPages.length > 10) {
    throw new opError('Pages must be less than 10', 400)
  }

}