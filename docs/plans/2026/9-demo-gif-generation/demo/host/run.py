#!/usr/bin/env python3
"""Main orchestration script for demo GIF generation."""

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
DEMO_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = DEMO_DIR / "output"
GUEST_DIR = DEMO_DIR / "guest"

DEFAULT_SSH_PORT = 2222
DEFAULT_DAEMON_PORT = 9999
SSH_USER = "demo"
SSH_OPTIONS = [
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ConnectTimeout=10",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate demo GIFs for sutto",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --scenario basic_usage
  %(prog)s --scenario multi_monitor --session wayland
  %(prog)s --all
        """,
    )
    parser.add_argument(
        "--scenario",
        help="Scenario name to run (without .py extension)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all scenarios",
    )
    parser.add_argument(
        "--session",
        choices=["x11", "wayland", "both"],
        default="both",
        help="Session type(s) to record",
    )
    parser.add_argument(
        "--resolution",
        default="1920x1080",
        help="Display resolution",
    )
    parser.add_argument(
        "--ssh-port",
        type=int,
        default=DEFAULT_SSH_PORT,
        help="SSH port on host",
    )
    parser.add_argument(
        "--skip-vm-start",
        action="store_true",
        help="Assume VM is already running",
    )
    parser.add_argument(
        "--keep-webm",
        action="store_true",
        help="Keep intermediate WebM files",
    )
    parser.add_argument(
        "--daemon-port",
        type=int,
        default=DEFAULT_DAEMON_PORT,
        help="Recording daemon port",
    )
    return parser.parse_args()


def ssh_run(port: int, command: str, check: bool = True) -> subprocess.CompletedProcess:
    """Run command via SSH."""
    cmd = ["ssh", *SSH_OPTIONS, "-p", str(port), f"{SSH_USER}@localhost", command]
    return subprocess.run(cmd, capture_output=True, text=True, check=check)


def scp_to_vm(port: int, local_path: Path, remote_path: str) -> None:
    """Copy file to VM."""
    cmd = ["scp", *SSH_OPTIONS, "-P", str(port), str(local_path), f"{SSH_USER}@localhost:{remote_path}"]
    subprocess.run(cmd, check=True)


def scp_from_vm(port: int, remote_path: str, local_path: Path) -> None:
    """Copy file from VM."""
    cmd = ["scp", *SSH_OPTIONS, "-P", str(port), f"{SSH_USER}@localhost:{remote_path}", str(local_path)]
    subprocess.run(cmd, check=True)


def sync_guest_scripts(port: int) -> None:
    """Sync guest scripts to VM."""
    print("Syncing guest scripts to VM...")
    cmd = [
        "rsync", "-avz", "--delete",
        "-e", f"ssh {' '.join(SSH_OPTIONS)} -p {port}",
        f"{GUEST_DIR}/",
        f"{SSH_USER}@localhost:~/demo/",
    ]
    subprocess.run(cmd, check=True)


def send_daemon_command(port: int, cmd: dict, timeout: int = 300) -> dict:
    """Send command to recording daemon."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)

    try:
        sock.connect(("localhost", port))
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


def check_daemon(port: int) -> bool:
    """Check if daemon is running."""
    try:
        result = send_daemon_command(port, {"action": "ping"}, timeout=5)
        return result.get("status") == "ok"
    except (socket.error, socket.timeout):
        return False


def get_available_scenarios() -> list[str]:
    """List available scenario names."""
    scenarios_dir = GUEST_DIR / "scenarios"
    return [
        f.stem for f in scenarios_dir.glob("*.py")
        if not f.stem.startswith("_")
    ]


def run_scenario(args: argparse.Namespace, scenario: str, session: str) -> Path | None:
    """Run a single scenario and return path to generated GIF."""
    print(f"\n{'='*60}")
    print(f"Running scenario: {scenario} ({session})")
    print(f"{'='*60}")

    output_subdir = OUTPUT_DIR / session
    output_subdir.mkdir(parents=True, exist_ok=True)

    remote_webm = f"/tmp/{scenario}.webm"
    remote_gif = f"/tmp/{scenario}.gif"

    try:
        print("Starting recording via daemon...")
        result = send_daemon_command(
            args.daemon_port,
            {
                "action": "record",
                "scenario": scenario,
                "output": remote_webm,
            },
        )

        if result.get("status") != "ok":
            print(f"Recording failed: {result.get('message')}", file=sys.stderr)
            return None

        print("Converting to GIF...")
        ssh_result = ssh_run(
            args.ssh_port,
            f"cd ~/demo && python3 convert_gif.py {remote_webm} {remote_gif}",
            check=False,
        )

        if ssh_result.returncode != 0:
            print(f"GIF conversion failed: {ssh_result.stderr}", file=sys.stderr)
            return None

        local_gif = output_subdir / f"{scenario}.gif"
        print(f"Copying GIF to {local_gif}...")
        scp_from_vm(args.ssh_port, remote_gif, local_gif)

        if args.keep_webm:
            local_webm = output_subdir / f"{scenario}.webm"
            scp_from_vm(args.ssh_port, remote_webm, local_webm)

        print(f"Generated: {local_gif}")
        return local_gif

    except socket.error as e:
        print(f"Error communicating with daemon: {e}", file=sys.stderr)
        return None
    except subprocess.CalledProcessError as e:
        print(f"Error running scenario: {e}", file=sys.stderr)
        return None


def wait_for_gnome(args: argparse.Namespace) -> bool:
    """Wait for GNOME to be ready."""
    wait_script = SCRIPT_DIR / "wait_gnome.py"
    result = subprocess.run(
        [sys.executable, str(wait_script), "--ssh-port", str(args.ssh_port)],
        check=False,
    )
    return result.returncode == 0


def main() -> None:
    args = parse_args()

    if not args.scenario and not args.all:
        print("Error: Must specify --scenario or --all", file=sys.stderr)
        sys.exit(1)

    scenarios = get_available_scenarios() if args.all else [args.scenario]
    sessions = ["x11", "wayland"] if args.session == "both" else [args.session]

    if not scenarios:
        print("No scenarios found!", file=sys.stderr)
        sys.exit(1)

    print(f"Scenarios to run: {', '.join(scenarios)}")
    print(f"Sessions: {', '.join(sessions)}")

    if not args.skip_vm_start:
        print("\nNote: Start VM manually with start_vm.py before running this script")

    if not wait_for_gnome(args):
        print("Error: GNOME is not ready", file=sys.stderr)
        sys.exit(1)

    sync_guest_scripts(args.ssh_port)

    print("Checking recording daemon...")
    if not check_daemon(args.daemon_port):
        print(f"Error: Recording daemon not running on port {args.daemon_port}", file=sys.stderr)
        print("Start it in the VM with: python3 ~/demo/daemon.py", file=sys.stderr)
        sys.exit(1)
    print("Daemon is ready")

    results = []
    for session in sessions:
        for scenario in scenarios:
            gif_path = run_scenario(args, scenario, session)
            results.append((scenario, session, gif_path))

    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")

    success_count = 0
    for scenario, session, gif_path in results:
        status = "OK" if gif_path else "FAILED"
        if gif_path:
            success_count += 1
        print(f"  {scenario} ({session}): {status}")

    print(f"\nTotal: {success_count}/{len(results)} succeeded")

    if success_count < len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
