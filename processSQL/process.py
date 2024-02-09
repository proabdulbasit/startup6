import pdfplumber

# Path to your PDF file
pdf_path = 'laws.pdf'

def extract_text_from_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        full_text = ''
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"  # Adding a newline for each page
    return full_text

if __name__ == "__main__":
    text = extract_text_from_pdf(pdf_path)
    print(text)
    # Optionally, save the text to a file
    with open('extracted_text.txt', 'w', encoding='utf-8') as f:
        f.write(text)