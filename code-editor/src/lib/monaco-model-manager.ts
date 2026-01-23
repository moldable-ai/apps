/**
 * Monaco Model Manager
 *
 * Manages Monaco editor models to preserve undo history across tab switches
 * and file reopens within a session. Models are cached by file path and only
 * destroyed when explicitly closed or when the manager is reset.
 */
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface CachedModel {
  model: editor.ITextModel
  originalContent: string // Content when file was first opened (for dirty tracking)
}

class MonacoModelManager {
  private models = new Map<string, CachedModel>()
  private monaco: Monaco | null = null

  /**
   * Set the Monaco instance (called once when editor mounts)
   */
  setMonaco(monaco: Monaco) {
    this.monaco = monaco
  }

  /**
   * Get or create a model for a file path
   */
  getOrCreateModel(
    path: string,
    content: string,
    language: string,
  ): editor.ITextModel {
    if (!this.monaco) {
      throw new Error('Monaco not initialized. Call setMonaco first.')
    }

    const cached = this.models.get(path)
    if (cached) {
      return cached.model
    }

    // Create a URI for the model (Monaco uses URIs to identify models)
    const uri = this.monaco.Uri.parse(`file://${path}`)

    // Check if a model with this URI already exists (edge case)
    let model = this.monaco.editor.getModel(uri)
    if (!model) {
      model = this.monaco.editor.createModel(content, language, uri)
    }

    this.models.set(path, {
      model,
      originalContent: content,
    })

    return model
  }

  /**
   * Get an existing model (returns undefined if not found)
   */
  getModel(path: string): editor.ITextModel | undefined {
    return this.models.get(path)?.model
  }

  /**
   * Check if a model exists for a path
   */
  hasModel(path: string): boolean {
    return this.models.has(path)
  }

  /**
   * Get the original content for dirty tracking
   */
  getOriginalContent(path: string): string | undefined {
    return this.models.get(path)?.originalContent
  }

  /**
   * Update the original content (called after save)
   */
  markAsSaved(path: string) {
    const cached = this.models.get(path)
    if (cached) {
      cached.originalContent = cached.model.getValue()
    }
  }

  /**
   * Check if a file is dirty (has unsaved changes)
   */
  isDirty(path: string): boolean {
    const cached = this.models.get(path)
    if (!cached) return false
    return cached.model.getValue() !== cached.originalContent
  }

  /**
   * Get current content of a model
   */
  getContent(path: string): string | undefined {
    return this.models.get(path)?.model.getValue()
  }

  /**
   * Update model content externally (e.g., file changed on disk)
   * This resets the undo stack
   */
  updateContent(path: string, content: string, resetOriginal = false) {
    const cached = this.models.get(path)
    if (cached) {
      cached.model.setValue(content)
      if (resetOriginal) {
        cached.originalContent = content
      }
    }
  }

  /**
   * Dispose a model (called when tab is closed)
   */
  disposeModel(path: string) {
    const cached = this.models.get(path)
    if (cached) {
      cached.model.dispose()
      this.models.delete(path)
    }
  }

  /**
   * Dispose all models (called when project is closed)
   */
  disposeAll() {
    for (const [, cached] of this.models) {
      cached.model.dispose()
    }
    this.models.clear()
  }

  /**
   * Get all open model paths
   */
  getOpenPaths(): string[] {
    return Array.from(this.models.keys())
  }
}

// Singleton instance
export const modelManager = new MonacoModelManager()
