from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, detail: str, code: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail={"detail": detail, "code": code})


class NotFoundError(AppException):
    def __init__(self, detail: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedError(AppException):
    def __init__(self, detail: str = "Unauthorized", code: str = "UNAUTHORIZED"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(AppException):
    def __init__(self, detail: str = "Forbidden", code: str = "FORBIDDEN"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_403_FORBIDDEN)


class RateLimitError(AppException):
    def __init__(self, detail: str = "Rate limit exceeded", code: str = "RATE_LIMIT_EXCEEDED"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_429_TOO_MANY_REQUESTS)


class ExtractionError(AppException):
    def __init__(self, detail: str = "Extraction failed", code: str = "EXTRACTION_FAILED"):
        super().__init__(detail=detail, code=code, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
