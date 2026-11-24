"""Protected endpoints, ownership rules and admin privileges."""

from conftest import auth_header, create_post, register_user


def test_protected_endpoints_require_token(client):
    for path in ("/api/auth/me", "/api/posts/mine", "/api/admin/stats"):
        assert client.get(path).status_code == 401
    assert client.post("/api/posts", json={"title": "x", "content": "y"}).status_code == 401


def test_user_cannot_edit_or_delete_another_users_post(client):
    owner = auth_header(client, "owner@example.com", "Owner")
    stranger = auth_header(client, "stranger@example.com", "Stranger")
    post_id = create_post(client, owner).get_json()["post"]["id"]

    assert client.put(f"/api/posts/{post_id}", json={"title": "Stolen"}, headers=stranger).status_code == 403
    assert client.delete(f"/api/posts/{post_id}", headers=stranger).status_code == 403


def test_admin_role_from_allow_list_and_admin_actions(client):
    admin = auth_header(client, "admin@blogsphere.local", "Admin")
    assert client.get("/api/auth/me", headers=admin).get_json()["user"]["role"] == "admin"

    user = register_user(client, "member@example.com", "Member").get_json()["user"]
    post_id = create_post(client, admin).get_json()["post"]["id"]

    assert client.get("/api/admin/stats", headers=admin).status_code == 200
    assert client.delete(f"/api/posts/{post_id}", headers=admin).status_code == 200
    assert client.put(
        f"/api/admin/users/{user['id']}/role", json={"role": "admin"}, headers=admin
    ).status_code == 200
    assert client.delete(f"/api/admin/users/{user['id']}", headers=admin).status_code == 200


def test_non_admin_cannot_use_admin_endpoints(client):
    user = auth_header(client)
    assert client.get("/api/admin/users", headers=user).status_code == 403
    assert client.get("/api/admin/posts", headers=user).status_code == 403


def test_admin_cannot_delete_self(client):
    admin = auth_header(client, "admin@blogsphere.local", "Admin")
    admin_id = client.get("/api/auth/me", headers=admin).get_json()["user"]["id"]
    assert client.delete(f"/api/admin/users/{admin_id}", headers=admin).status_code == 403
