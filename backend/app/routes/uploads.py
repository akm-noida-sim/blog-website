"""Authenticated featured-image uploads stored on the server filesystem."""

import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from ..decorators import require_auth
from ..errors import ValidationError

bp = Blueprint("uploads", __name__, url_prefix="/api")


@bp.post("/upload")
@require_auth
def upload_image():
    file = request.files.get("image")
    if file is None or not file.filename:
        raise ValidationError("No image was provided.", details={"image": "Choose an image to upload."})

    extension = secure_filename(file.filename).rsplit(".", 1)[-1].lower()
    if extension not in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]:
        raise ValidationError(
            "Unsupported file type. Use PNG, JPG, JPEG, GIF or WEBP.",
            details={"image": "Unsupported file type."},
        )

    filename = f"{uuid.uuid4().hex}.{extension}"
    folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(folder, exist_ok=True)
    file.save(os.path.join(folder, filename))

    base = current_app.config.get("PUBLIC_API_URL", "").rstrip("/")
    url = f"{base}/uploads/{filename}"
    return (
        jsonify(
            {
                "message": "Image uploaded successfully.",
                "url": url,
                "filename": filename,
            }
        ),
        201,
    )
