"""Registration, login, session and profile tests."""

from conftest import auth_header, register_user


def test_registration_hashes_password_and_issues_token(client, app):
    response = register_user(client)
    assert response.status_code == 201
    body = response.get_json()
    assert body["user"]["email"] == "reader@example.com"
    assert body["token"]

    with app.app_context():
        from app.database import get_db

        stored = get_db().users.find_one({"email": "reader@example.com"})
        assert stored["passwordHash"] != "Password123"
        assert stored["role"] == "user"


def test_duplicate_registration_is_rejected(client):
    register_user(client)
    response = register_user(client)
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "conflict"


def test_weak_registration_fields_are_reported(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "A", "email": "not-an-email", "password": "short"},
    )
    assert response.status_code == 400
    details = response.get_json()["error"]["details"]
    assert {"name", "email", "password"} <= set(details)


def test_login_and_me(client):
    register_user(client)
    response = client.post(
        "/api/auth/login", json={"email": "reader@example.com", "password": "Password123"}
    )
    assert response.status_code == 200
    token = response.get_json()["token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.get_json()["user"]["name"] == "Reader"


def test_wrong_password_does_not_login(client):
    register_user(client)
    response = client.post(
        "/api/auth/login", json={"email": "reader@example.com", "password": "WrongPassword1"}
    )
    assert response.status_code == 400


def test_logout_blacklists_token(client):
    headers = auth_header(client)
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"


def test_profile_and_password_update(client):
    headers = auth_header(client)
    response = client.put(
        "/api/auth/profile",
        json={"name": "Updated Reader", "bio": "Hello world", "website": "https://example.com"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()["user"]["bio"] == "Hello world"

    response = client.put(
        "/api/auth/password",
        json={"currentPassword": "Password123", "newPassword": "NewPassword456"},
        headers=headers,
    )
    assert response.status_code == 200
    assert client.post(
        "/api/auth/login",
        json={"email": "reader@example.com", "password": "NewPassword456"},
    ).status_code == 200
