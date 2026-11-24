"""BlogSphere Flask application factory."""

import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from . import database, errors
from .config import Config
from .routes import blueprints


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    CORS(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
    )
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    errors.register_error_handlers(app)
    database.init_app(app)
    database.init_indexes(app)

    for blueprint in blueprints:
        app.register_blueprint(blueprint)

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.get("/")
    def index():
        return jsonify(
            {
                "name": "BlogSphere API",
                "version": "1.0.0",
                "docs": "/api/health",
            }
        )

    return app
