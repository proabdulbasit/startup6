import re

def reformat_article_content(input_file_path, output_file_path):
    # Open the input file and read its content
    with open(input_file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Define a regex pattern to match the structure of the insert_article calls
    pattern = re.compile(r"insert_article\('(.*?)', '(.*?)', '(.*?)'\)", re.DOTALL)
    
    # Open the output file for writing the reformatted content
    with open(output_file_path, 'w', encoding='utf-8') as output_file:
        for match in pattern.finditer(content):
            article_number, source, article_content = match.groups()
            
            # Remove newline characters and additional spaces within the article content
            formatted_content = ' '.join(article_content.replace('\n', ' ').split())
            
            # Construct the reformatted insert_article call
            reformatted_call = f"insert_article('{article_number}', '{source}', '{formatted_content}')\n"
            
            # Write the reformatted call to the output file
            output_file.write(reformatted_call)

# File paths
input_file_path = 'LeyTránsitoYSeguridadVial2.txt'  # Adjust as necessary
output_file_path = 'LeyTránsitoYSeguridadVial3.txt'  # The output file with reformatted content

# Run the reformatting function
reformat_article_content(input_file_path, output_file_path)
