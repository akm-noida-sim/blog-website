"""Pytest fixtures backed by a real (isolated) MongoDB database."""

import shutil
import tempfile

import pytest

from app import create_app
from app.database import get_db


@pytest.fixture(scope="session")
def app():
    upload_dir = tempfile.mkdtemp(prefix="blogsphere-test-uploads-")
    application = create_app(
        {
            "TESTING": True,
            "DEBUG": False,
            "DB_NAME": "blogsphere_test",
            "JWT_SECRET": "test-jwt-secret-that-is-at-least-32-bytes-long",
            "JWT_EXPIRES_IN": 3600,
            "ADMIN_EMAILS": {"admin@blogsphere.local"},
            "UPLOAD_FOLDER": upload_dir,
            "CORS_ORIGINS": ["http://localhost:5173"],
        }
    )
    yield application
    shutil.rmtree(upload_dir, ignore_errors=True)


@pytest.fixture
def client(app):
    with app.app_context():
        db = get_db()
        for collection in db.list_collection_names():
            if not collection.startswith("system."):
                db[collection].delete_many({})
    return app.test_client()


def register_user(client, email="reader@example.com", name="Reader", password="Password123"):
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    return response


def auth_header(client, email="reader@example.com", name="Reader"):
    response = register_user(client, email=email, name=name)
    assert response.status_code == 201, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['token']}"}


def create_post(client, headers, **overrides):
    payload = {
        "title": "A thoughtful title about Flask",
        "content": "# Heading\n\nThis is a long enough body for a published blog post.",
        "status": "published",
        "tags": ["flask"],
        "categories": ["Backend"],
    }
    payload.update(overrides)
    return client.post("/api/posts", json=payload, headers=headers)
