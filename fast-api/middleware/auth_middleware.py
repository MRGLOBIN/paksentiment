from fastapi import Request
from fastapi.responses import JSONResponse
from Key import APIKEY

async def auth_key_middleware(request: Request, call_next):
    if request.method in ["GET", "POST"]:
        api_key = request.headers.get("x-api-key")
        if api_key != APIKEY:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized - Invalid API key"}
            )

    response = await call_next(request)
    return response
