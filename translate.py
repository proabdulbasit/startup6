from transformers import MBartTokenizer, MBartForConditionalGeneration

# Load the mBART model and tokenizer
model_name = "facebook/mbart-large-cc25"
tokenizer = MBartTokenizer.from_pretrained(model_name)
model = MBartForConditionalGeneration.from_pretrained(model_name)

# Read the content of the input text file
input_file_path = "gay2.txt"  # Replace with the path to your input text file
with open(input_file_path, "r", encoding="utf-8") as file:
    input_text = file.read()

# Define source and target languages
tokenizer.src_lang = "es_XX"
tokenizer.tgt_lang = "en_XX"
# Split the input text into smaller segments if it's too long
max_length = 1024  # Adjust as needed
input_segments = [input_text[i:i+max_length] for i in range(0, len(input_text), max_length)]

# Initialize an empty list to store translated segments
translated_segments = []


for segment in input_segments:
    input_ids = tokenizer.encode(segment, return_tensors="pt")
    output_ids = model.generate(input_ids, max_length=150, num_beams=4, early_stopping=True)
    output_text = tokenizer.decode(output_ids[0], skip_special_tokens=True)
    translated_segments.append(output_text)

output_text = " ".join(translated_segments)

# Save the translated text to a new text file
output_file_path = "output.txt"  # Replace with the path where you want to save the translated text
with open(output_file_path, "w", encoding="utf-8") as output_file:
    output_file.write(output_text)

print(f"Translation saved to {output_file_path}")
