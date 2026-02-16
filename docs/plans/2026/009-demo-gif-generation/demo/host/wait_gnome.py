#!/usr/bin/env python3
"""Wait for GNOME Shell to be ready in the VM."""

import argparse
import subprocess
import sys
import time

DEFAULT_SSH_PORT = 2222
DEFAULT_TIMEOUT = 300
POLL_INTERVAL = 5


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Wait for GNOME Shell startup in VM")
    parser.add_argument(
        "--ssh-port",
        type=int,
        default=DEFAULT_SSH_PORT,
        help="SSH port on host",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="Timeout in seconds",
    )
    parser.add_argument(
        "--user",
        default="demo",
        help="SSH username",
    )
    return parser.parse_args()


def ssh_command(args: argparse.Namespace, command: str) -> subprocess.CompletedProcess:
    """Execute command via SSH with proper options."""
    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ConnectTimeout=5",
        "-p", str(args.ssh_port),
        f"{args.user}@localhost",
        command,
    ]
    return subprocess.run(
        ssh_cmd,
        capture_output=True,
        text=True,
        timeout=30,
    )


def wait_for_ssh(args: argparse.Namespace, timeout: int) -> bool:
    """Wait for SSH to become available."""
    print("Waiting for SSH...")
    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            result = ssh_command(args, "echo ok")
            if result.returncode == 0:
                print("SSH is ready")
                return True
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass
        time.sleep(POLL_INTERVAL)

    return False


def get_dbus_session_command(inner_cmd: str) -> str:
    """Wrap command with D-Bus session environment from gnome-shell."""
    return (
        "PID=$(pgrep -x gnome-shell) && "
        "DBUS_ADDR=$(grep -z DBUS_SESSION_BUS_ADDRESS /proc/$PID/environ 2>/dev/null | tr '\\0' '\\n') && "
        f"export $DBUS_ADDR && DISPLAY=:0 {inner_cmd}"
    )


def wait_for_gnome_shell(args: argparse.Namespace, timeout: int) -> bool:
    """Wait for GNOME Shell to be running and responsive."""
    print("Waiting for GNOME Shell...")
    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            result = ssh_command(
                args,
                get_dbus_session_command(
                    "gdbus call --session "
                    "--dest org.gnome.Shell "
                    "--object-path /org/gnome/Shell "
                    "--method org.freedesktop.DBus.Properties.Get "
                    "org.gnome.Shell ShellVersion"
                )
            )
            if result.returncode == 0 and result.stdout.strip():
                version = result.stdout.strip()
                print(f"GNOME Shell is ready: {version}")
                return True
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass

        time.sleep(POLL_INTERVAL)

    return False


def wait_for_screencast_service(args: argparse.Namespace, timeout: int) -> bool:
    """Wait for GNOME Screencast D-Bus service to be available."""
    print("Waiting for Screencast service...")
    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            result = ssh_command(
                args,
                get_dbus_session_command(
                    "gdbus introspect --session "
                    "--dest org.gnome.Shell.Screencast "
                    "--object-path /org/gnome/Shell/Screencast"
                )
            )
            if result.returncode == 0 and "Screencast" in result.stdout:
                print("Screencast service is ready")
                return True
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass

        time.sleep(POLL_INTERVAL)

    return False


def main() -> None:
    args = parse_args()

    ssh_timeout = args.timeout // 2
    gnome_timeout = args.timeout // 2

    if not wait_for_ssh(args, ssh_timeout):
        print("Error: SSH did not become available within timeout", file=sys.stderr)
        sys.exit(1)

    if not wait_for_gnome_shell(args, gnome_timeout):
        print("Error: GNOME Shell did not start within timeout", file=sys.stderr)
        sys.exit(1)

    if not wait_for_screencast_service(args, 60):
        print("Warning: Screencast service not detected, recording may fail", file=sys.stderr)

    print("\nGNOME environment is ready for recording!")


if __name__ == "__main__":
    main()
