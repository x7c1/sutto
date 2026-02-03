// UI Layer
// Thin layer that delegates to UseCase layer
// Creates domain objects from user input and handles exceptions

// The UI layer is currently in src/app/ (gradual migration)
// Future components will be placed here:
// - main-panel/ - Main snapping panel UI
// - settings/ - Preferences page UI

// GObject synchronization pattern for UI components:
// 1. UI components hold mutable GObject properties for GTK bindings
// 2. Domain objects are immutable - create new instances on changes
// 3. UI sync: domainObj -> GObject properties (one-way)
// 4. User input: GObject properties -> create new domain object -> save via UseCase
