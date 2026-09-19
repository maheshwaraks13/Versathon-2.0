from fastapi import FastAPI

app = FastAPI(title="Medical Report Simplifier API")


@app.get("/")
def home():
    return {
        "message": "Medical Report Simplifier API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }