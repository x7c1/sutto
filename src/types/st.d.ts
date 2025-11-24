/**
 * Type definitions for St (Shell Toolkit)
 * St is the widget toolkit used by GNOME Shell
 */

declare namespace St {
    /**
     * Button widget
     */
    interface Button {
        /**
         * Sets the child widget of the button
         */
        set_child(child: Widget): void;

        /**
         * Connects a signal to a callback
         */
        connect(signal: string, callback: () => boolean): number;

        /**
         * Destroys the widget
         */
        destroy(): void;
    }

    /**
     * Base widget interface
     */
    type Widget = object;

    /**
     * Label widget
     */
    interface Label extends Widget {
        text: string;
        y_align: number;
    }

    /**
     * Button constructor options
     */
    interface ButtonOptions {
        style_class?: string;
        reactive?: boolean;
        can_focus?: boolean;
        track_hover?: boolean;
    }

    /**
     * Label constructor options
     */
    interface LabelOptions {
        text: string;
        y_align: number;
    }

    /**
     * Button constructor
     */
    const Button: {
        new (options: ButtonOptions): Button;
    };

    /**
     * Label constructor
     */
    const Label: {
        new (options: LabelOptions): Label;
    };
}

declare const St: typeof St;
