/**
 * Type definitions for GNOME Shell Panel
 */

declare namespace imports.ui.panel {
    /**
     * Panel box for containing widgets
     */
    interface PanelBox {
        /**
         * Inserts a child widget at the specified index
         */
        insert_child_at_index(child: St.Widget, index: number): void;

        /**
         * Removes a child widget
         */
        remove_child(child: St.Widget): void;
    }

    /**
     * Panel interface
     */
    interface Panel {
        /**
         * Right box of the panel (contains system indicators)
         */
        _rightBox: PanelBox;

        /**
         * Left box of the panel (contains activities button)
         */
        _leftBox: PanelBox;

        /**
         * Center box of the panel (contains date/time)
         */
        _centerBox: PanelBox;
    }
}

/**
 * Extend Main interface to include panel
 */
interface Main {
    panel: imports.ui.panel.Panel;
}
