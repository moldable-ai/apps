/**
 * File-based project structure:
 *
 * data/projects/{project-id}/
 * ├── project.json        # Metadata (this type without compositionCode)
 * ├── Composition.tsx     # Root composition code
 * ├── components/         # Optional sub-components (future)
 * └── assets/             # Media files (future)
 */

// Project metadata stored in project.json
export type ProjectMetadata = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  // Composition settings
  width: number
  height: number
  fps: number
  durationInFrames: number
  // Auto-duration setting
  autoDuration?: boolean
  // Optional thumbnail (base64 or URL)
  thumbnail?: string
}

// Full project with code loaded from Composition.tsx
export type Project = ProjectMetadata & {
  compositionCode: string
}

// For listing projects (no code needed)
export type ProjectListItem = ProjectMetadata

export type CreateProjectInput = {
  name: string
  description?: string
  width?: number
  height?: number
  fps?: number
  durationInFrames?: number
  autoDuration?: boolean
  compositionCode?: string
}

export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'createdAt'>>

// Default composition code for new projects
// Note: Import statements are optional - Remotion exports are automatically available:
// AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Img
export const DEFAULT_COMPOSITION_CODE = `// Remotion exports are automatically available (no imports needed)

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animations
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const textBlur = interpolate(frame, [0, 15], [15, 0], { extrapolateRight: 'clamp' });
  const textY = interpolate(frame, [0, 15], [15, 0], { extrapolateRight: 'clamp' });

  const logoOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });
  const logoBlur = interpolate(frame, [15, 30], [10, 0], { extrapolateRight: 'clamp' });
  const logoY = interpolate(frame, [15, 30], [10, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'oklch(0.235 0 0)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 80,
          fontWeight: 800,
          color: 'white',
          letterSpacing: -2,
          opacity: textOpacity,
          filter: \`blur(\${textBlur}px)\`,
          transform: \`translateY(\${textY}px)\`,
          marginBottom: 32,
          lineHeight: 1
        }}>
          Now introducing
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 24,
          opacity: logoOpacity,
          filter: \`blur(\${logoBlur}px)\`,
          transform: \`translateY(\${logoY}px)\`
        }}>
          <Img 
            src="https://moldable.sh/logo.svg" 
            style={{ width: 100, height: 100 }} 
          />
          <Img 
            src="https://moldable.sh/logo-text.svg" 
            style={{ height: 60, filter: 'invert(1)' }} 
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
`
