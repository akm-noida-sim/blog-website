"""Post CRUD, discovery, drafts and filtering tests."""

from conftest import auth_header, create_post, register_user


def test_create_and_read_post(client):
    headers = auth_header(client)
    created = create_post(client, headers)
    assert created.status_code == 201
    post = created.get_json()["post"]
    assert post["status"] == "published"
    assert post["slug"].startswith("a-thoughtful-title")

    single = client.get(f"/api/posts/{post['id']}")
    assert single.status_code == 200
    assert single.get_json()["post"]["content"].startswith("# Heading")
    assert single.get_json()["post"]["views"] == 1

    by_slug = client.get(f"/api/posts/{post['slug']}")
    assert by_slug.status_code == 200


def test_drafts_are_private_but_visible_to_author(client):
    headers = auth_header(client)
    draft = create_post(client, headers, title="Private draft notes", status="draft").get_json()["post"]

    assert client.get(f"/api/posts/{draft['id']}").status_code == 404
    assert client.get(f"/api/posts/{draft['id']}", headers=headers).status_code == 200
    assert all(p["id"] != draft["id"] for p in client.get("/api/posts").get_json()["posts"])
    mine = client.get("/api/posts/mine?status=draft", headers=headers).get_json()
    assert mine["pagination"]["total"] == 1


def test_search_category_tag_and_sort(client):
    headers = auth_header(client)
    create_post(client, headers, title="Flask REST APIs", tags=["python"], categories=["Backend"])
    create_post(client, headers, title="React component patterns", tags=["javascript"], categories=["Frontend"])

    assert client.get("/api/posts?search=Flask").get_json()["pagination"]["total"] == 1
    assert client.get("/api/posts?category=frontend").get_json()["pagination"]["total"] == 1
    assert client.get("/api/posts?tag=python").get_json()["pagination"]["total"] == 1
    assert client.get("/api/posts?search=nonexistent").get_json()["pagination"]["total"] == 0
    assert client.get("/api/posts?sort=popular").status_code == 200

    page = client.get("/api/posts?page=1&limit=1").get_json()
    assert page["pagination"]["pages"] == 2
    assert page["pagination"]["hasNext"] is True


def test_author_can_edit_and_delete(client):
    headers = auth_header(client)
    post_id = create_post(client, headers).get_json()["post"]["id"]

    updated = client.put(
        f"/api/posts/{post_id}",
        json={"title": "An even better title", "featured": True},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.get_json()["post"]["featured"] is True
    assert client.get("/api/posts/featured").get_json()["posts"][0]["id"] == post_id

    assert client.delete(f"/api/posts/{post_id}", headers=headers).status_code == 200
    assert client.get(f"/api/posts/{post_id}").status_code == 404


def test_invalid_post_payload_is_rejected(client):
    headers = auth_header(client)
    response = client.post("/api/posts", json={"title": "x", "content": "short"}, headers=headers)
    assert response.status_code == 400
    assert "title" in response.get_json()["error"]["details"]
    assert "content" in response.get_json()["error"]["details"]


def test_draft_can_be_published(client):
    headers = auth_header(client)
    post_id = create_post(client, headers, status="draft").get_json()["post"]["id"]
    response = client.put(f"/api/posts/{post_id}", json={"status": "published"}, headers=headers)
    assert response.status_code == 200
    assert response.get_json()["post"]["publishedAt"]
    assert client.get("/api/posts").get_json()["pagination"]["total"] == 1
