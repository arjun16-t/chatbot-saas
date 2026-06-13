from ingest import ingest
from query import query

from config import Colors

from pathlib import Path

test_dir = Path('test_docs/')
file_path = test_dir / 'sebi.pdf'
client_id = 'temp_123'
ingestion = ingest(file_path=file_path, client_id=client_id)

print('====== INGESTION PIPELINE ======')
for key, value in ingestion.items():
    print(f'{Colors.CYAN}{key} \t\t| {value}{Colors.END}')

question = "What documents are required to update bank account details for physical shareholdings?"

results = query(question, client_id)
print('====== QUERY PIPELINE ======')
for key, value in results.items():
    print(f'{Colors.CYAN}{key} \t\t| {value}{Colors.END}')