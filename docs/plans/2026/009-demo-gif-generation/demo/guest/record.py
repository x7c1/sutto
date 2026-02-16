#!/usr/bin/env python3
"""Recording execution entry point for demo scenarios."""

import argparse
import importlib.util
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
SCENARIOS_DIR = SCRIPT_DIR / "scenarios"

sys.path.insert(0, str(SCRIPT_DIR))

from lib.screencast import Screencast


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Record a demo scenario")
    parser.add_argument(
        "--scenario",
        required=True,
        help="Scenario name (without .py extension)",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output WebM file path",
    )
    parser.add_argument(
        "--framerate",
        type=int,
        default=30,
        help="Recording framerate",
    )
    parser.add_argument(
        "--pre-delay",
        type=float,
        default=1.0,
        help="Delay before starting scenario (seconds)",
    )
    parser.add_argument(
        "--post-delay",
        type=float,
        default=1.0,
        help="Delay after scenario completes (seconds)",
    )
    return parser.parse_args()


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


def list_scenarios() -> list[str]:
    """List available scenario names."""
    return [
        f.stem for f in SCENARIOS_DIR.glob("*.py")
        if not f.stem.startswith("_")
    ]


def main() -> None:
    args = parse_args()

    print(f"Loading scenario: {args.scenario}")
    try:
        scenario = load_scenario(args.scenario)
    except (FileNotFoundError, ImportError, AttributeError) as e:
        print(f"Error: {e}", file=sys.stderr)
        print(f"Available scenarios: {', '.join(list_scenarios())}", file=sys.stderr)
        sys.exit(1)

    screencast = Screencast()

    print(f"Starting recording: {args.output}")
    options = {"framerate": args.framerate}

    if not screencast.start(args.output, options):
        print("Error: Failed to start recording", file=sys.stderr)
        sys.exit(1)

    try:
        print(f"Pre-scenario delay: {args.pre_delay}s")
        time.sleep(args.pre_delay)

        print("Running scenario...")
        scenario.run()

        print(f"Post-scenario delay: {args.post_delay}s")
        time.sleep(args.post_delay)

    finally:
        print("Stopping recording...")
        if not screencast.stop():
            print("Warning: Failed to stop recording cleanly", file=sys.stderr)

    print(f"Recording complete: {args.output}")


if __name__ == "__main__":
    main()
