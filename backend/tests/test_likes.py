"""Like toggling and per-user uniqueness tests."""

from conftest import auth_header, create_post


def test_toggle_like_updates_count(client):
    headers = auth_header(client)
    post_id = create_post(client, headers).get_json()["post"]["id"]

    anonymous = client.get(f"/api/likes/{post_id}").get_json()
    assert anonymous == {"liked": False, "likeCount": 0}

    liked = client.post(f"/api/likes/{post_id}", headers=headers).get_json()
    assert liked["liked"] is True
    assert liked["likeCount"] == 1
    assert client.get(f"/api/posts/{post_id}", headers=headers).get_json()["post"]["likedByMe"] is True
    assert client.get(f"/api/posts/{post_id}").get_json()["post"]["likedByMe"] is False

    unliked = client.post(f"/api/likes/{post_id}", headers=headers).get_json()
    assert unliked["liked"] is False
    assert unliked["likeCount"] == 0


def test_multiple_users_can_like_once_each(client):
    first = auth_header(client, "first@example.com", "First")
    second = auth_header(client, "second@example.com", "Second")
    post_id = create_post(client, first).get_json()["post"]["id"]

    assert client.post(f"/api/likes/{post_id}", headers=first).get_json()["likeCount"] == 1
    assert client.post(f"/api/likes/{post_id}", headers=second).get_json()["likeCount"] == 2
    assert client.get(f"/api/likes/{post_id}", headers=first).get_json()["liked"] is True
    assert client.get(f"/api/likes/{post_id}").get_json()["likeCount"] == 2


def test_like_requires_authentication(client):
    headers = auth_header(client)
    post_id = create_post(client, headers).get_json()["post"]["id"]
    assert client.post(f"/api/likes/{post_id}").status_code == 401
