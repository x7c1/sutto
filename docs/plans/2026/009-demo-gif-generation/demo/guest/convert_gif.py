#!/usr/bin/env python3
"""Convert WebM recording to optimized GIF."""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert WebM to optimized GIF")
    parser.add_argument("input", help="Input WebM file")
    parser.add_argument("output", help="Output GIF file")
    parser.add_argument(
        "--fps",
        type=int,
        default=15,
        help="Output GIF framerate",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=800,
        help="Output GIF width (height auto-scaled)",
    )
    parser.add_argument(
        "--colors",
        type=int,
        default=256,
        help="Number of colors in palette",
    )
    parser.add_argument(
        "--lossy",
        type=int,
        default=80,
        help="Gifsicle lossy compression level (0-200)",
    )
    return parser.parse_args()


def run_command(cmd: list[str], description: str) -> bool:
    """Run command and print status."""
    print(f"  {description}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  Error: {result.stderr}", file=sys.stderr)
        return False
    return True


def convert_webm_to_gif(
    input_path: Path,
    output_path: Path,
    fps: int,
    width: int,
    colors: int,
    lossy: int,
) -> bool:
    """Convert WebM to optimized GIF using ffmpeg and gifsicle.

    Uses simple conversion for compatibility with Duration: N/A videos.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        raw_gif_path = tmp / "raw.gif"

        # Simple conversion without fps filter (works with Duration: N/A)
        if not run_command(
            [
                "ffmpeg", "-y",
                "-i", str(input_path),
                "-vf", f"scale={width}:-1:flags=lanczos",
                "-r", str(fps),
                str(raw_gif_path),
            ],
            "Creating GIF",
        ):
            return False

        # Optimize with gifsicle
        gifsicle_cmd = [
            "gifsicle",
            "--optimize=3",
            f"--lossy={lossy}",
            "--colors", str(colors),
            str(raw_gif_path),
            "-o", str(output_path),
        ]
        if not run_command(gifsicle_cmd, "Optimizing GIF"):
            return False

    return True


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Converting {input_path} to {output_path}")
    print(f"  Settings: {args.fps}fps, {args.width}px width, {args.colors} colors")

    success = convert_webm_to_gif(
        input_path,
        output_path,
        args.fps,
        args.width,
        args.colors,
        args.lossy,
    )

    if not success:
        print("Conversion failed!", file=sys.stderr)
        sys.exit(1)

    size_kb = output_path.stat().st_size / 1024
    print(f"Done! Output size: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
