"""GNOME Screencast D-Bus wrapper for screen recording."""

from pathlib import Path

from gi.repository import Gio, GLib

SCREENCAST_BUS_NAME = "org.gnome.Shell.Screencast"
SCREENCAST_OBJECT_PATH = "/org/gnome/Shell/Screencast"
SCREENCAST_INTERFACE = "org.gnome.Shell.Screencast"


class Screencast:
    """Wrapper for GNOME Shell Screencast D-Bus API.

    Uses GIO D-Bus bindings to maintain the connection during recording,
    preventing "Sender has vanished" errors.
    """

    def __init__(self) -> None:
        self._recording = False
        self._output_path: Path | None = None
        self._proxy: Gio.DBusProxy | None = None

    def _get_proxy(self) -> Gio.DBusProxy:
        """Get or create the D-Bus proxy."""
        if self._proxy is None:
            self._proxy = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                None,
                SCREENCAST_BUS_NAME,
                SCREENCAST_OBJECT_PATH,
                SCREENCAST_INTERFACE,
                None,
            )
        return self._proxy

    @property
    def is_recording(self) -> bool:
        return self._recording

    def start(self, output_path: str | Path, options: dict | None = None) -> bool:
        """Start screen recording.

        Args:
            output_path: Path for output WebM file
            options: Optional options dict (e.g., {"framerate": 30})

        Returns:
            True if recording started successfully
        """
        if self._recording:
            return False

        self._output_path = Path(output_path)

        proxy = self._get_proxy()

        # Build options variant
        builder = GLib.VariantBuilder.new(GLib.VariantType.new("a{sv}"))
        if options:
            for k, v in options.items():
                if isinstance(v, bool):
                    val = GLib.Variant.new_boolean(v)
                elif isinstance(v, int):
                    val = GLib.Variant.new_int32(v)
                elif isinstance(v, str):
                    val = GLib.Variant.new_string(v)
                else:
                    continue
                entry = GLib.Variant.new_dict_entry(
                    GLib.Variant.new_string(k),
                    GLib.Variant.new_variant(val)
                )
                builder.add_value(entry)
        opts = builder.end()

        try:
            args = GLib.Variant.new_tuple(
                GLib.Variant.new_string(str(self._output_path)),
                opts
            )
            result = proxy.call_sync(
                "Screencast",
                args,
                Gio.DBusCallFlags.NONE,
                -1,
                None,
            )

            success, path = result.unpack()
            if success:
                self._recording = True
                return True

        except GLib.Error as e:
            print(f"Screencast start error: {e}")

        return False

    def stop(self) -> bool:
        """Stop screen recording.

        Returns:
            True if recording stopped successfully
        """
        if not self._recording:
            return False

        proxy = self._get_proxy()

        try:
            result = proxy.call_sync(
                "StopScreencast",
                None,
                Gio.DBusCallFlags.NONE,
                -1,
                None,
            )

            success = result.unpack()[0]
            if success:
                self._recording = False
                return True

        except GLib.Error as e:
            print(f"Screencast stop error: {e}")

        return False

    def __enter__(self) -> "Screencast":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._recording:
            self.stop()
