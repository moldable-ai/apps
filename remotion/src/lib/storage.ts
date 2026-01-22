/**
 * Project storage utilities
 *
 * Structure:
 * data/projects/{project-id}/
 * ├── project.json        # Metadata
 * ├── Composition.tsx     # Root composition code
 * ├── components/         # Optional sub-components
 * └── assets/             # Media files
 */
import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { Project, ProjectMetadata } from './types'
import { readFile, writeFile } from 'fs/promises'

// Get the projects root directory
export function getProjectsDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects')
}

// Get a specific project's directory
export function getProjectDir(
  workspaceId: string | undefined,
  projectId: string,
): string {
  return safePath(getProjectsDir(workspaceId), projectId)
}

// Get the project metadata file path
export function getProjectMetadataPath(
  workspaceId: string | undefined,
  projectId: string,
): string {
  return safePath(getProjectDir(workspaceId, projectId), 'project.json')
}

// Get the composition file path
export function getCompositionPath(
  workspaceId: string | undefined,
  projectId: string,
): string {
  return safePath(getProjectDir(workspaceId, projectId), 'Composition.tsx')
}

// Get the index file path (list of project IDs)
export function getIndexPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects-index.json')
}

// Get the exports directory
export function getExportsDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'exports')
}

/**
 * Read project metadata only (for listing)
 */
export async function readProjectMetadata(
  workspaceId: string | undefined,
  projectId: string,
): Promise<ProjectMetadata | null> {
  const metadataPath = getProjectMetadataPath(workspaceId, projectId)
  return readJson<ProjectMetadata | null>(metadataPath, null)
}

/**
 * Read full project with composition code
 */
export async function readProject(
  workspaceId: string | undefined,
  projectId: string,
): Promise<Project | null> {
  const metadata = await readProjectMetadata(workspaceId, projectId)
  if (!metadata) return null

  const compositionPath = getCompositionPath(workspaceId, projectId)

  try {
    const compositionCode = await readFile(compositionPath, 'utf-8')
    return { ...metadata, compositionCode }
  } catch {
    // If composition file doesn't exist, return empty code
    return { ...metadata, compositionCode: '' }
  }
}

/**
 * Write project metadata
 */
export async function writeProjectMetadata(
  workspaceId: string | undefined,
  projectId: string,
  metadata: ProjectMetadata,
): Promise<void> {
  const projectDir = getProjectDir(workspaceId, projectId)
  await ensureDir(projectDir)
  await writeJson(getProjectMetadataPath(workspaceId, projectId), metadata)
}

/**
 * Write composition code
 */
export async function writeCompositionCode(
  workspaceId: string | undefined,
  projectId: string,
  code: string,
): Promise<void> {
  const projectDir = getProjectDir(workspaceId, projectId)
  await ensureDir(projectDir)
  await writeFile(getCompositionPath(workspaceId, projectId), code, 'utf-8')
}

/**
 * Write full project (metadata + composition)
 */
export async function writeProject(
  workspaceId: string | undefined,
  project: Project,
): Promise<void> {
  const { compositionCode, ...metadata } = project
  await writeProjectMetadata(workspaceId, project.id, metadata)
  await writeCompositionCode(workspaceId, project.id, compositionCode)
}

/**
 * Read the project index (list of IDs)
 */
export async function readProjectIndex(
  workspaceId?: string,
): Promise<string[]> {
  return readJson<string[]>(getIndexPath(workspaceId), [])
}

/**
 * Write the project index
 */
export async function writeProjectIndex(
  workspaceId: string | undefined,
  ids: string[],
): Promise<void> {
  await writeJson(getIndexPath(workspaceId), ids)
}
