import requests


AI = "http://127.0.0.1:8001/api/v1/health"


def main() -> None:
    try:
        resp = requests.get(AI, timeout=5)
        print(f"ai_service: HTTP {resp.status_code} {resp.text}")
    except requests.RequestException as exc:
        print(f"ai_service: FAIL {exc}")


if __name__ == "__main__":
    main()

