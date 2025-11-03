import logging
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient, models
# --- ⬇️ ADDED THESE IMPORTS ⬇️ ---
from qdrant_client.http.models import Distance, VectorParams
from pydantic import BaseModel

app = FastAPI()

# --- LOAD MODELS (This happens once on startup) ---
model = SentenceTransformer('all-MiniLM-L6-v2')
qdrant = QdrantClient(url="https://b98cd3f8-031f-4da1-b00a-57dfb85ac677.us-east4-0.gcp.cloud.qdrant.io:6333",
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.W4azvzn32WMeQjS3Bnf4uZ4Jv_Onf3J5jaQ-nl6tSws") # <-- ⚠️ ADD YOUR API KEY BACK

COLLECTION_NAME = "villas"
VECTOR_SIZE = 384 # Vector size for 'all-MiniLM-L6-v2'

# --- ⬇️ ADDED THIS BLOCK TO CREATE COLLECTION ON STARTUP ⬇️ ---
try:
    # Check if the collection already exists
    qdrant.get_collection(collection_name=COLLECTION_NAME)
    logging.info(f"Collection '{COLLECTION_NAME}' already exists.")
except Exception as e:
    # If it doesn't exist, create it
    logging.warning(f"Collection '{COLLECTION_NAME}' not found. Creating it...")
    qdrant.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    logging.info(f"Collection '{COLLECTION_NAME}' created successfully.")
# --- ⬆️ END OF NEW BLOCK ⬆️ ---


# --- DEFINE DATA SHAPES ---
# This is what your Next.js app will send to this service
class VillaIndexRequest(BaseModel):
    mongo_id: str
    name: str
    description: str
    bedrooms: int
    amenities: list[str]

class VillaDeleteRequest(BaseModel):
    mongo_id: str

# --- ENDPOINT 1: To add/update a villa ---
@app.post("/index-villa")
def index_villa(villa: VillaIndexRequest):
    # 1. Create the "semantic text"
    text = f"{villa.name}. {villa.description}. {villa.bedrooms} bedrooms. Amenities: {', '.join(villa.amenities)}"
    
    # 2. Convert text to vector
    vector = model.encode(text).tolist()
    
    # 3. Save to Qdrant (the vector DB)
    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=villa.mongo_id,  # Use the MongoDB ID as the Qdrant ID!
                vector=vector,
                payload={"mongo_id": villa.mongo_id} # Store it again just in case
            )
        ]
    )
    return {"status": "indexed", "id": villa.mongo_id}

# --- ENDPOINT 2: To search for villas ---
@app.get("/search")
def search_villas(query: str):
    # 1. Convert user's query to vector
    query_vector = model.encode(query).tolist()
    
    # 2. Search Qdrant
    search_results = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=5
    )
    
    # 3. Extract just the MongoDB IDs from the results
    ids = [result.payload["mongo_id"] for result in search_results]
    
    return {"ids": ids} # Return the list of IDs


@app.post("/delete-villa")
def delete_villa(villa: VillaDeleteRequest):
    qdrant.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.PointIdsList(
            points=[villa.mongo_id],
        )
    )
    return {"status": "deleted", "id": villa.mongo_id}