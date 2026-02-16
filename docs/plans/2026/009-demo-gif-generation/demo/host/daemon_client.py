#!/usr/bin/env python3
"""Client for communicating with the recording daemon in the VM."""

import argparse
import json
import socket
import sys

DEFAULT_PORT = 9999
DEFAULT_TIMEOUT = 300  # 5 minutes for long recordings


def send_command(host: str, port: int, cmd: dict, timeout: int = DEFAULT_TIMEOUT) -> dict:
    """Send command to daemon and return response."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)

    try:
        sock.connect((host, port))
        sock.sendall(json.dumps(cmd).encode("utf-8") + b"\n")

        data = b""
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
            if b"\n" in data:
                break

        return json.loads(data.decode("utf-8").strip())

    finally:
        sock.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Recording daemon client")
    parser.add_argument(
        "--host",
        default="localhost",
        help="Daemon host",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help="Daemon port",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="Timeout in seconds",
    )

    subparsers = parser.add_subparsers(dest="action", required=True)

    # ping
    subparsers.add_parser("ping", help="Ping the daemon")

    # list
    subparsers.add_parser("list", help="List available scenarios")

    # record
    record_parser = subparsers.add_parser("record", help="Record a scenario")
    record_parser.add_argument("scenario", help="Scenario name")
    record_parser.add_argument("--output", default="/tmp/recording.webm", help="Output path")
    record_parser.add_argument("--pre-delay", type=float, default=1.0)
    record_parser.add_argument("--post-delay", type=float, default=1.0)

    args = parser.parse_args()

    if args.action == "ping":
        cmd = {"action": "ping"}
    elif args.action == "list":
        cmd = {"action": "list_scenarios"}
    elif args.action == "record":
        cmd = {
            "action": "record",
            "scenario": args.scenario,
            "output": args.output,
            "pre_delay": args.pre_delay,
            "post_delay": args.post_delay,
        }
    else:
        print(f"Unknown action: {args.action}", file=sys.stderr)
        sys.exit(1)

    try:
        result = send_command(args.host, args.port, cmd, args.timeout)
        print(json.dumps(result, indent=2))

        if result.get("status") != "ok":
            sys.exit(1)

    except socket.timeout:
        print("Error: Connection timed out", file=sys.stderr)
        sys.exit(1)
    except ConnectionRefusedError:
        print("Error: Connection refused. Is the daemon running?", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
