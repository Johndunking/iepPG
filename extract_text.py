import sys
import re
from pdfminer.high_level import extract_text

# Custom mapping for (cid:...) sequences
cid_mapping = {
    51: 'ti',
    56: 'tti',
    75: 'tti',
    73: 'ft',
    76: 'tt',
    37: 'ti',
    29: 'ti',
    59: 'ti',
    62: 'tt',


      # Example mapping: cid:51 should translate to "ti"
    # Add other mappings here if needed
}

# Function to convert (cid:...) to corresponding characters using the custom mapping
def cidToChar(cidx):
    cid_value = int(re.findall(r'\(cid\:(\d+)\)', cidx)[0])
    return cid_mapping.get(cid_value, f'(cid:{cid_value})')  # Return the mapped value or the original if not found

# Function to replace all (cid:...) sequences in the text
def replace_cid_sequences(text):
    lines = text.split('\n')
    converted_lines = []

    for line in lines:
        if line:  # Skip empty lines
            # Find all (cid:...) sequences in the line
            cids = re.findall(r'\(cid\:\d+\)', line)
            # Replace each (cid:...) with the corresponding character or string
            for cid in cids:
                line = line.replace(cid, cidToChar(cid))
            converted_lines.append(line)

    return '\n'.join(converted_lines)

def main(pdf_path):
    # Extract text from the PDF
    text = extract_text(pdf_path)
    # Replace (cid:...) sequences
    converted_text = replace_cid_sequences(text)
    # Print the converted text
    print(converted_text)

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    main(pdf_path)