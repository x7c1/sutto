# MVVM (Model-View-ViewModel) Overview

## Overview

MVVM is a GUI architectural pattern that separates UI from business logic through a ViewModel layer. The ViewModel holds observable state and the View binds to it, enabling loose coupling and testability.

## Structure

```
┌─────────┐      ┌─────────────┐      ┌─────────┐
│  View   │ ←──→ │  ViewModel  │ ───→ │  Model  │
└─────────┘      └─────────────┘      └─────────┘
   binds to        holds state         business
   ViewModel       notifies View       logic/data
```

## Components

### View
- UI elements (buttons, labels, etc.)
- Observes ViewModel state
- Sends user actions to ViewModel
- Contains no business logic

### ViewModel
- Holds UI state (observable/bindable)
- Exposes state and commands to View
- Calls Model/Usecases for business logic
- Does NOT reference View directly

### Model
- Domain entities and business rules
- Data access (repositories, APIs) — in original MVVM
- Independent of UI concerns

## Original MVVM vs MVVM + Clean Architecture

### Original MVVM (WPF, etc.)

In the original MVVM pattern, Model encompasses both domain entities and data access:

```
View → ViewModel → Model (entities + repositories + API/DB)
```

The Model layer is responsible for everything related to data: business rules, persistence, and external service calls.

### MVVM + Clean Architecture (Modern Practice)

In modern development (especially Android/iOS), MVVM is commonly combined with Clean Architecture. This is the approach recommended by Google for Android development.

```
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer                                      │
│   View ←→ ViewModel                                     │
├─────────────────────────────────────────────────────────┤
│ Domain Layer                                            │
│   Usecases (Interactors) + Entities                     │
├─────────────────────────────────────────────────────────┤
│ Data Layer                                              │
│   Repository impl + API clients + DB                    │
└─────────────────────────────────────────────────────────┘
```

In this approach:
- **MVVM** governs the UI layer (View + ViewModel)
- **Clean Architecture** provides the overall layer separation
- **Model** refers only to Domain entities
- **Data access** is isolated in the Data/Infrastructure layer

### Why Combine Them?

| Aspect | Original MVVM | MVVM + Clean Architecture |
|--------|---------------|---------------------------|
| Model scope | Broad (data + access) | Narrow (domain only) |
| Testability | Moderate | High |
| Scalability | Limited | Better for large apps |
| Complexity | Lower | Higher |

Most large-scale projects use the combined approach because original MVVM's Model becomes unwieldy as the application grows.

## Data Flow

```
User Action → View → ViewModel → Model
                ↓
State Change → ViewModel (updates state)
                ↓
View observes → UI updates automatically
```

## Key Characteristics

| Aspect | Description |
|--------|-------------|
| Binding | View subscribes to ViewModel state changes |
| Decoupling | ViewModel has no reference to View |
| Testability | ViewModel can be unit tested without UI |
| State | ViewModel is stateful, holds UI state |

## ViewModel vs Usecase

| | ViewModel | Usecase/Interactor |
|--|-----------|-------------------|
| State | Stateful | Stateless |
| Responsibility | UI state management | Single business operation |
| Subscribers | Yes (View binds) | No |
| Granularity | Per screen/feature | Per action |

## Common Implementations

- **Android**: Jetpack ViewModel + LiveData/StateFlow
- **iOS**: SwiftUI + ObservableObject
- **WPF/.NET**: INotifyPropertyChanged
- **Web**: Vue.js, Knockout.js

## References

- [Guide to app architecture | Android Developers](https://developer.android.com/topic/architecture)
- [Better Android Apps Using MVVM with Clean Architecture | Toptal](https://www.toptal.com/android/android-apps-mvvm-with-clean-architecture)
- [MVVM Clean Architecture in Android | Medium](https://medium.com/@anandgaur2207/mvvm-clean-architecture-in-android-be5ef3f05330)
- [The Evolution of Android Architecture Patterns (2025) | droidcon](https://www.droidcon.com/2025/01/27/the-evolution-of-android-architecture-patterns-from-ui-centric-to-mvc-to-mvp-to-mvvm-to-mvi/)
- [MVVM as a complementary pattern for Clean Architecture | Spaceteams](https://www.spaceteams.de/en/insights/mvvm-as-a-complementary-pattern-for-clean-architecture-applications)
- [Model–view–viewmodel | Wikipedia](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93viewmodel)
