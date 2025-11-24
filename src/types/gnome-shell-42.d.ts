/**
 * Type definitions for GNOME Shell 42 (GJS imports API)
 *
 * These are custom type definitions for GNOME Shell 42, which uses the legacy
 * `imports` module system. The types are based on the official @girs packages
 * but adapted for the imports API.
 *
 * ## Why custom type definitions?
 *
 * GNOME Shell 42 uses the legacy `imports` API, but official @girs type
 * definitions only support GNOME Shell 45+ with ESM imports. There is no
 * @girs/gnome-shell@42 package available.
 *
 * ## How to add new types:
 *
 * 1. Check installed @girs packages in node_modules/@girs/
 *    Example: node_modules/@girs/st-1.0/st-1.0.d.ts
 *
 * 2. Search for the type you need:
 *    ```bash
 *    grep "class Button" node_modules/@girs/st-1.0/st-1.0.d.ts
 *    grep "interface Button" node_modules/@girs/st-1.0/st-1.0.d.ts
 *    ```
 *
 * 3. Extract the relevant interface/class definition:
 *    - Constructor properties
 *    - Methods you actually use
 *    - Properties you access
 *
 * 4. Add it to the appropriate section below:
 *    - St types: from @girs/st-1.0
 *    - Clutter types: from @girs/clutter-10
 *    - GNOME Shell UI: from @girs/gnome-shell (if available for reference)
 *
 * 5. Add to the `imports` declaration at the bottom
 *
 * Note: Only add types you actually use. Don't copy entire definitions.
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
