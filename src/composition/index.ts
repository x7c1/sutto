/**
 * Composition Layer
 *
 * Responsible for dependency injection and wiring concrete implementations.
 * This layer knows about concrete classes from all layers and composes them together.
 *
 * Guidelines:
 * - Create factory functions that return configured instances
 * - Import concrete implementations here
 * - Export only factory functions, not concrete classes
 * - Other layers should depend on interfaces, not concrete implementations
 */

export {
  getSpaceCollectionRepository,
  resetSpaceCollectionRepository,
} from './space-collection-repository.js';
