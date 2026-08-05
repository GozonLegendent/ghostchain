from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "org-c is running"}
