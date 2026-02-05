import os

import pytest


@pytest.fixture(scope="session")
def base_url() -> str:
    host = os.environ.get("API_HOST", "localhost")
    port = os.environ.get("API_PORT", "9000")
    return f"http://{host}:{port}"
