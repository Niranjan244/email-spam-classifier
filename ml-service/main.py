import os
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.model_manager import model_manager
from app.trainer import train_model

app = FastAPI(title="Email Spam Classifier ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TrainRequest(BaseModel):
    file_path: str = Field(..., description="Path to CSV dataset")
    test_size: float = Field(0.2, description="Test split proportion")
    algorithm: str = Field(
        "logistic_regression",
        description="Classifier algorithm: logistic_regression or naive_bayes",
    )


class ActivateRequest(BaseModel):
    version: str = Field(..., min_length=1, description="Model version to activate")


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Email content to classify")


class PredictBatchRequest(BaseModel):
    texts: list[str] = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="List of email texts to classify (max 1000)",
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else {}
    error_msg = first_error.get("msg", "Validation error")
    loc = first_error.get("loc", [])
    if "texts" in loc and "too_long" in str(first_error.get("type", "")):
        error_msg = "Batch size cannot exceed 1000 items"
    elif "texts" in loc and "too_short" in str(first_error.get("type", "")):
        error_msg = "Batch texts list cannot be empty"

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "data": None,
            "message": error_msg,
        },
    )


@app.get("/health")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "active_version": model_manager.active_version,
            "has_active_model": model_manager.is_active(),
        },
        "message": "ML service is healthy",
    }


@app.get("/models")
def list_models_endpoint():
    models = model_manager.list_models()
    return {
        "success": True,
        "data": models,
        "message": "Models retrieved successfully",
    }


@app.post("/activate")
def activate_endpoint(payload: ActivateRequest):
    try:
        active_ver = model_manager.activate_model(payload.version)
        return {
            "success": True,
            "data": {"active_version": active_ver},
            "message": f"Model '{active_ver}' activated successfully",
        }
    except ValueError as err:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": str(err),
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "Failed to activate model",
            },
        )


@app.post("/train")
def train_endpoint(payload: TrainRequest):
    try:
        metrics = train_model(
            file_path=payload.file_path,
            test_size=payload.test_size,
            algorithm=payload.algorithm,
        )
        return {
            "success": True,
            "data": metrics,
            "message": "Model trained successfully",
        }
    except ValueError as err:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": str(err),
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "Failed to train model",
            },
        )


@app.post("/predict")
def predict_endpoint(payload: PredictRequest):
    if not payload.text or not payload.text.strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": "Email text must be provided and cannot be empty",
            },
        )

    try:
        result = model_manager.predict_one(payload.text.strip())
        return {
            "success": True,
            "data": result,
            "message": "Prediction completed successfully",
        }
    except RuntimeError as err:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": str(err),
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "Failed to classify email",
            },
        )


@app.post("/predict-batch")
def predict_batch_endpoint(payload: PredictBatchRequest):
    if len(payload.texts) > 1000:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": "Batch size cannot exceed 1000 items",
            },
        )

    if not payload.texts:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": "Batch texts list cannot be empty",
            },
        )

    try:
        results = model_manager.predict_batch(payload.texts)
        return {
            "success": True,
            "data": results,
            "message": "Batch prediction completed successfully",
        }
    except RuntimeError as err:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "data": None,
                "message": str(err),
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "Failed to process batch prediction",
            },
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
