from fastapi import FastAPI

app = FastAPI(title="Build in Public API")


@app.get("/health")
def health_check():
    return {"status": "ok"}
