#!/usr/bin/env python3
"""Recording daemon that runs within the GNOME session.

This daemon listens on a TCP port and accepts commands to start/stop
recording and run scenarios. It runs in the GNOME session context,
so D-Bus calls work correctly without "Sender has vanished" errors.
"""

import argparse
import importlib.util
import json
import socket
import sys
import threading
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
SCENARIOS_DIR = SCRIPT_DIR / "scenarios"

sys.path.insert(0, str(SCRIPT_DIR))

from lib.screencast import Screencast

DEFAULT_PORT = 9999


def load_scenario(name: str):
    """Load scenario module by name."""
    scenario_path = SCENARIOS_DIR / f"{name}.py"

    if not scenario_path.exists():
        raise FileNotFoundError(f"Scenario not found: {scenario_path}")

    spec = importlib.util.spec_from_file_location(name, scenario_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load scenario: {name}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if not hasattr(module, "run"):
        raise AttributeError(f"Scenario {name} must have a 'run' function")

    return module


def handle_command(cmd: dict) -> dict:
    """Handle a command and return result."""
    action = cmd.get("action")

    if action == "ping":
        return {"status": "ok", "message": "pong"}

    elif action == "record":
        scenario_name = cmd.get("scenario")
        output_path = cmd.get("output", "/tmp/recording.webm")
        pre_delay = cmd.get("pre_delay", 1.0)
        post_delay = cmd.get("post_delay", 1.0)

        try:
            scenario = load_scenario(scenario_name)
        except Exception as e:
            return {"status": "error", "message": str(e)}

        screencast = Screencast()

        if not screencast.start(output_path):
            return {"status": "error", "message": "Failed to start recording"}

        try:
            time.sleep(pre_delay)
            scenario.run()
            time.sleep(post_delay)
        finally:
            screencast.stop()

        return {"status": "ok", "output": output_path}

    elif action == "list_scenarios":
        scenarios = [
            f.stem for f in SCENARIOS_DIR.glob("*.py")
            if not f.stem.startswith("_")
        ]
        return {"status": "ok", "scenarios": scenarios}

    else:
        return {"status": "error", "message": f"Unknown action: {action}"}


def handle_client(conn: socket.socket, addr: tuple) -> None:
    """Handle a client connection."""
    print(f"Connection from {addr}")

    try:
        data = b""
        while True:
            chunk = conn.recv(4096)
            if not chunk:
                break
            data += chunk
            if b"\n" in data:
                break

        if data:
            try:
                cmd = json.loads(data.decode("utf-8").strip())
                result = handle_command(cmd)
            except json.JSONDecodeError as e:
                result = {"status": "error", "message": f"Invalid JSON: {e}"}
            except Exception as e:
                result = {"status": "error", "message": str(e)}

            conn.sendall(json.dumps(result).encode("utf-8") + b"\n")

    finally:
        conn.close()
        print(f"Connection from {addr} closed")


def run_server(port: int) -> None:
    """Run the daemon server."""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", port))
    server.listen(5)

    print(f"Recording daemon listening on port {port}")
    print("Commands: ping, record, list_scenarios")

    try:
        while True:
            conn, addr = server.accept()
            thread = threading.Thread(target=handle_client, args=(conn, addr))
            thread.daemon = True
            thread.start()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Recording daemon")
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help="Port to listen on",
    )
    args = parser.parse_args()

    run_server(args.port)


if __name__ == "__main__":
    main()
