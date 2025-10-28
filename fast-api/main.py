from fastapi import FastAPI
import uvicorn
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from middleware.auth_middleware import auth_key_middleware

uri = "mongodb+srv://UsmanMalik:paksentiment@paksentimentcluster.fiah2to.mongodb.net/?appName=PakSentimentCluster"

client = MongoClient(uri, server_api=ServerApi('1'))

app = FastAPI()

@app.on_event("startup")
async def startup_db():
    try:
        client.admin.command('ping')
        print("database ok")
    except Exception as e:
        print(e)

app.middleware("http")(auth_key_middleware)

@app.get('/')
async def root():
    return {'message': 'Get: Main'}

@app.get('/search')
async def search():
    return {'message': 'Get: Search'}

@app.post('/get')
async def getter():
    return {'message': 'Post: Get'}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)