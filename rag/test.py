from .config import Colors
from .ingest import ingest
from .query import query

file_path = "rag/test_docs/sebi.pdf"
client_id = 'temp_123'
project_id = 'project_temp'
ingestion = ingest(file_path=file_path, client_id=client_id, project_id=project_id)

print('====== INGESTION PIPELINE ======')
for key, value in ingestion.items():
    print(f'{Colors.CYAN}{key} \t\t| {value}{Colors.END}')

question = "What documents are required to update bank account details for physical shareholdings?"

results = query(question, client_id, project_id)
print('====== QUERY PIPELINE ======')
for key, value in results.items():
    print(f'{Colors.CYAN}{key} \t\t| {value}{Colors.END}')