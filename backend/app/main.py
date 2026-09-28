from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api import users, requests, gate, notifications, admin

app = FastAPI(
    title="Gatepass Management System",
    description="RBAC-based Gate Pass API",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Uniform error schema: {"code": <int>, "message": <str>}
# ---------------------------------------------------------------------------

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    headers = getattr(exc, "headers", None) or {}
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "message": exc.detail},
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Summarise validation errors into a human-readable message
    errors = exc.errors()
    message = "; ".join(
        f"{' → '.join(str(loc) for loc in e['loc'])}: {e['msg']}" for e in errors
    )
    return JSONResponse(
        status_code=422,
        content={"code": 422, "message": message},
    )


app.include_router(users.router, prefix="/api/v1")
app.include_router(requests.router, prefix="/api/v1")
app.include_router(gate.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Gatepass API is running", "version": "0.4.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
