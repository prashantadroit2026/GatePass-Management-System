from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import users, requests, gate, notifications

app = FastAPI(
    title="Gatepass Management System",
    description="RBAC-based Gate Pass API",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(requests.router, prefix="/api/v1")
app.include_router(gate.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Gatepass API is running", "version": "0.3.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
