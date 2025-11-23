/**
 * Type definitions for GNOME Shell 42 (GJS imports API)
 *
 * These are custom type definitions for GNOME Shell 42, which uses the legacy
 * `imports` module system. The types are based on the official @girs packages
 * but adapted for the imports API.
 */

// ============================================================================
// Clutter Types (from @girs/clutter-10)
// ============================================================================

declare namespace Clutter {
    interface Actor {
        destroy(): void;
    }

    enum ActorAlign {
        FILL = 0,
        START = 1,
        CENTER = 2,
        END = 3,
    }
}

// ============================================================================
// St (Shell Toolkit) Types (from @girs/st-1.0)
// ============================================================================

declare namespace St {
    interface LabelConstructorProperties {
        text?: string;
        style_class?: string;
        style?: string;
        x_align?: Clutter.ActorAlign;
        y_align?: Clutter.ActorAlign;
        x_expand?: boolean;
        y_expand?: boolean;
        can_focus?: boolean;
        track_hover?: boolean;
        reactive?: boolean;
        visible?: boolean;
    }

    interface Label extends Clutter.Actor {
        text: string;
        clutter_text: Clutter.Actor;

        get_text(): string;
        set_text(text: string): void;
        get_clutter_text(): Clutter.Actor;
        destroy(): void;
    }

    interface LabelConstructor {
        new (props?: LabelConstructorProperties): Label;
    }
}

// ============================================================================
// GNOME Shell UI Types
// ============================================================================

declare namespace UI {
    interface Panel {
        _leftBox: any;
        _centerBox: any;
        _rightBox: {
            insert_child_at_index(child: Clutter.Actor, index: number): void;
            remove_child(child: Clutter.Actor): void;
        };
    }

    interface Main {
        panel: Panel;
    }
}

// ============================================================================
// GJS imports API for GNOME Shell 42
// ============================================================================

declare const imports: {
    gi: {
        St: {
            Label: St.LabelConstructor;
            [key: string]: any;
        };
        Clutter: {
            ActorAlign: typeof Clutter.ActorAlign;
            [key: string]: any;
        };
        [key: string]: any;
    };
    ui: {
        main: UI.Main;
        [key: string]: any;
    };
    [key: string]: any;
};
