"""Comment threads, replies and ownership tests."""

from conftest import auth_header, create_post


def test_add_edit_and_delete_comment(client):
    headers = auth_header(client)
    post_id = create_post(client, headers).get_json()["post"]["id"]

    created = client.post(
        f"/api/posts/{post_id}/comments", json={"content": "Great read!"}, headers=headers
    )
    assert created.status_code == 201
    comment_id = created.get_json()["comment"]["id"]

    listing = client.get(f"/api/posts/{post_id}/comments").get_json()
    assert listing["count"] == 1
    assert listing["comments"][0]["content"] == "Great read!"
    assert client.get(f"/api/posts/{post_id}").get_json()["post"]["commentCount"] == 1

    edited = client.put(
        f"/api/comments/{comment_id}", json={"content": "Even better read!"}, headers=headers
    )
    assert edited.status_code == 200
    assert edited.get_json()["comment"]["content"] == "Even better read!"

    assert client.delete(f"/api/comments/{comment_id}", headers=headers).status_code == 200
    assert client.get(f"/api/posts/{post_id}/comments").get_json()["count"] == 0


def test_reply_thread_and_cascade_delete(client):
    headers = auth_header(client)
    post_id = create_post(client, headers).get_json()["post"]["id"]
    parent_id = client.post(
        f"/api/posts/{post_id}/comments", json={"content": "Parent"}, headers=headers
    ).get_json()["comment"]["id"]
    reply = client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "Reply", "parentId": parent_id},
        headers=headers,
    )
    assert reply.status_code == 201

    listing = client.get(f"/api/posts/{post_id}/comments").get_json()
    assert listing["count"] == 2
    assert len(listing["comments"]) == 1
    assert listing["comments"][0]["replies"][0]["parentId"] == parent_id

    assert client.delete(f"/api/comments/{parent_id}", headers=headers).status_code == 200
    assert client.get(f"/api/posts/{post_id}/comments").get_json()["count"] == 0


def test_only_owner_can_modify_comment(client):
    owner_headers = auth_header(client, "owner@example.com", "Owner")
    other_headers = auth_header(client, "other@example.com", "Other")
    post_id = create_post(client, owner_headers).get_json()["post"]["id"]
    comment_id = client.post(
        f"/api/posts/{post_id}/comments", json={"content": "Mine"}, headers=owner_headers
    ).get_json()["comment"]["id"]

    response = client.put(
        f"/api/comments/{comment_id}", json={"content": "Hacked"}, headers=other_headers
    )
    assert response.status_code == 403
    assert client.delete(f"/api/comments/{comment_id}", headers=other_headers).status_code == 403


def test_comment_requires_authentication(client):
    headers = auth_header(client)
    post_id = create_post(client, headers).get_json()["post"]["id"]
    response = client.post(f"/api/posts/{post_id}/comments", json={"content": "Hi"})
    assert response.status_code == 401
