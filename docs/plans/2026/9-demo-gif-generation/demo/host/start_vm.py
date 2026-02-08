#!/usr/bin/env python3
"""Start the GNOME VM with specified display configuration."""

import argparse
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
PACKER_OUTPUT = SCRIPT_DIR.parent / "packer" / "output-sutto-demo"
VM_IMAGE = PACKER_OUTPUT / "sutto-demo.qcow2"
DEFAULT_SSH_PORT = 2222


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Start GNOME VM for demo recording")
    parser.add_argument(
        "--resolution",
        default="1920x1080",
        help="Display resolution (e.g., 1920x1080)",
    )
    parser.add_argument(
        "--monitors",
        type=int,
        default=1,
        choices=[1, 2, 3, 4],
        help="Number of monitors (1-4)",
    )
    parser.add_argument(
        "--session",
        choices=["x11", "wayland"],
        default="x11",
        help="Session type (x11 or wayland)",
    )
    parser.add_argument(
        "--memory",
        type=int,
        default=4096,
        help="Memory in MB",
    )
    parser.add_argument(
        "--cpus",
        type=int,
        default=2,
        help="Number of CPUs",
    )
    parser.add_argument(
        "--ssh-port",
        type=int,
        default=DEFAULT_SSH_PORT,
        help="SSH port forwarding on host",
    )
    parser.add_argument(
        "--spice-port",
        type=int,
        default=5900,
        help="SPICE port for display",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run without SPICE display",
    )
    parser.add_argument(
        "--daemon-port",
        type=int,
        default=9999,
        help="Recording daemon port forwarding",
    )
    parser.add_argument(
        "--vnc",
        action="store_true",
        help="Use VNC instead of SPICE",
    )
    return parser.parse_args()


def build_qemu_command(args: argparse.Namespace) -> list[str]:
    if not VM_IMAGE.exists():
        print(f"Error: VM image not found at {VM_IMAGE}", file=sys.stderr)
        print("Run 'packer build gnome-vm.pkr.hcl' first.", file=sys.stderr)
        sys.exit(1)

    width, height = args.resolution.split("x")

    cmd = [
        "qemu-system-x86_64",
        "-enable-kvm",
        "-m", str(args.memory),
        "-smp", str(args.cpus),
        "-drive", f"file={VM_IMAGE},format=qcow2,if=virtio",
        "-device", "virtio-net-pci,netdev=net0",
        "-netdev", f"user,id=net0,hostfwd=tcp::{args.ssh_port}-:22,hostfwd=tcp::{args.daemon_port}-:9999",
        "-vga", "none",
        "-device", f"qxl-vga,max_outputs={args.monitors},vram_size_mb=64,xres={width},yres={height}",
    ]

    if args.headless:
        cmd.extend(["-display", "none"])
    elif args.vnc:
        cmd.extend(["-vnc", ":0"])
    else:
        cmd.extend([
            "-spice", f"port={args.spice_port},disable-ticketing=on",
            "-device", "virtio-serial-pci",
            "-device", "virtserialport,chardev=spicechannel0,name=com.redhat.spice.0",
            "-chardev", "spicevmc,id=spicechannel0,name=vdagent",
        ])

    return cmd


def main() -> None:
    args = parse_args()

    print(f"Starting VM with {args.resolution} resolution, {args.monitors} monitor(s)")
    print(f"Session type: {args.session}")
    print(f"SSH will be available on port {args.ssh_port}")
    print(f"Daemon port forwarding: {args.daemon_port} -> 9999")
    if not args.headless:
        print(f"SPICE display on port {args.spice_port}")

    cmd = build_qemu_command(args)

    env = os.environ.copy()
    env["SUTTO_DEMO_SESSION"] = args.session

    print(f"\nRunning: {' '.join(cmd)}\n")

    try:
        subprocess.run(cmd, env=env, check=True)
    except KeyboardInterrupt:
        print("\nVM stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"VM exited with error: {e.returncode}", file=sys.stderr)
        sys.exit(e.returncode)


if __name__ == "__main__":
    main()
