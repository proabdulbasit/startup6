#THIS FILE IS USED TO RECOGNIZE EACH ARTICLE, THE CONTENT OF IT AND PUT IT IN A FORMAT TO SUBMIT TO A SQLITE DATABASE, 
#WITH THE NUMBER OF THE ARTICLE, THE SOURCE, E.G: CODIGO PENAL, AND THE CONTENT



import re

def parse_and_write_to_file(file_path, source, output_file_path):
    # Open and read the text file
    with open(file_path, 'r', encoding='utf-8') as file:
        text = file.read()

    # Define the regex pattern to match articles
    pattern = re.compile(r'Artículo (\d{1,4})(.*?)((?=Artículo \d{1,4})|$)', re.DOTALL)
    
    # Open the output file for writing
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        # Find all matches of the pattern in the text
        matches = pattern.findall(text)
        
        # Loop through the matches and write each article in the specified format to the output file
        for match in matches:
            article_number = match[0]
            content = match[1].strip()  # Clean up whitespace
            
            # Write in the specified format including full content
            output_file.write(f"insert_article('{article_number}', '{source}', '{content}')\n")

# Path to your text file and the desired output file
file_path = 'LeyTránsitoYSeguridadVial.txt'
source = "Ley de transito y seguridad vial"
output_file_path = 'LeyTránsitoYSeguridadVial2.txt'

# Parse the text file and write articles in the specified format to the output file
parse_and_write_to_file(file_path, source, output_file_path)
