'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as Babel from '@babel/standalone'
import { Player, PlayerRef } from '@remotion/player'
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

type RemotionPlayerProps = {
  code: string
  width: number
  height: number
  fps: number
  durationInFrames: number
  className?: string
  playerRef?: React.RefObject<PlayerRef | null>
  onError?: (error: string) => void
}

// Error boundary component for catching render errors
function ErrorDisplay({
  error,
  onFixInChat,
}: {
  error: string
  onFixInChat?: () => void
}) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 16,
          padding: 48,
          maxWidth: '80%',
        }}
      >
        <div
          style={{
            color: '#ef4444',
            fontSize: 36,
            fontWeight: 'bold',
            marginBottom: 24,
          }}
        >
          Composition Error
        </div>
        <pre
          style={{
            color: '#fca5a5',
            fontSize: 28,
            lineHeight: 1.5,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            marginBottom: onFixInChat ? 32 : 0,
          }}
        >
          {error}
        </pre>
        {onFixInChat && (
          <button
            onClick={onFixInChat}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '16px 32px',
              fontSize: 28,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            ✨ Fix in Chat
          </button>
        )}
      </div>
    </AbsoluteFill>
  )
}

// Fallback component shown while loading
function LoadingDisplay() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ color: 'white', fontSize: 18 }}>Loading composition...</div>
    </AbsoluteFill>
  )
}

// Strip import/export statements from user code since we inject dependencies manually
// and use our own export capture mechanism
function preprocessCode(code: string): string {
  // Process line by line for more reliable handling
  const lines = code.split('\n')
  const processedLines: string[] = []
  const declarations: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip import lines entirely
    if (trimmed.startsWith('import ')) {
      continue
    }

    // Handle export statements
    let processedLine = line
    if (trimmed.startsWith('export default ')) {
      processedLine = line.replace(/export\s+default\s+/, 'exports.default = ')
    } else if (trimmed.startsWith('export ')) {
      // Remove "export" keyword from "export const/let/var/function/class"
      processedLine = line.replace(/export\s+/, '')
    }

    processedLines.push(processedLine)

    // Track declarations for export capturing
    const declMatch = processedLine.match(/^\s*(?:const|let|var)\s+(\w+)/)
    const funcMatch = processedLine.match(/^\s*function\s+(\w+)/)
    if (declMatch) {
      declarations.push(declMatch[1])
    } else if (funcMatch) {
      declarations.push(funcMatch[1])
    }
  }

  let result = processedLines.join('\n').trim()

  // Add exports assignments at the end
  if (declarations.length > 0) {
    const exportAssignments = declarations
      .map(
        (name) =>
          `exports.${name} = typeof ${name} !== 'undefined' ? ${name} : undefined;`,
      )
      .join('\n')
    result = result + '\n\n' + exportAssignments
  }

  return result
}

// Create a component from user code
function createComponentFromCode(
  code: string,
  onError?: (error: string) => void,
): React.FC {
  try {
    // Preprocess: strip imports and convert exports to assignments
    const preprocessedCode = preprocessCode(code)

    // Transform TSX to JS using Babel
    const transformed = Babel.transform(preprocessedCode, {
      presets: ['react', 'typescript'],
      filename: 'composition.tsx',
    }).code

    if (!transformed) {
      throw new Error('Failed to transform code')
    }

    // Create the remotion imports that will be available to the code
    const remotionExports = {
      AbsoluteFill,
      useCurrentFrame,
      useVideoConfig,
      interpolate,
      spring,
      Sequence,
      Img,
      Audio,
    }

    // Create a function that returns the component
    const createModule = new Function(
      'React',
      'remotion',
      `
      const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Img, Audio } = remotion;
      const exports = {};
      ${transformed}
      return exports;
      `,
    )

    const moduleExports = createModule(React, remotionExports)

    // Look for MyComposition export or default export
    const Component =
      moduleExports.MyComposition ||
      moduleExports.default ||
      Object.values(moduleExports).find((v) => typeof v === 'function')

    if (!Component || typeof Component !== 'function') {
      throw new Error(
        'No component found. Export a component named "MyComposition" or use default export.',
      )
    }

    return Component as React.FC
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    // Return a component that displays the error
    const ErrorComponent: React.FC = () => (
      <ErrorDisplay
        error={errorMessage}
        onFixInChat={onError ? () => onError(errorMessage) : undefined}
      />
    )
    ErrorComponent.displayName = 'ErrorComponent'
    return ErrorComponent
  }
}

export function RemotionPlayer({
  code,
  width,
  height,
  fps,
  durationInFrames,
  className,
  playerRef,
  onError,
}: RemotionPlayerProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Memoize the component creation to avoid re-parsing on every render
  const CompositionComponent = useMemo(() => {
    if (!code) return LoadingDisplay
    return createComponentFromCode(code, onError)
  }, [code, onError])

  // Calculate display size maintaining aspect ratio
  const aspectRatio = width / height

  const inputProps = useMemo(() => ({}), [])

  if (!isClient) {
    return (
      <div className={className}>
        <div
          style={{
            aspectRatio,
            backgroundColor: '#1a1a2e',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
          }}
        >
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Player
        ref={playerRef}
        component={CompositionComponent}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{
          width: '100%',
          aspectRatio,
          borderRadius: 8,
          overflow: 'hidden',
        }}
        controls
        autoPlay={false}
        loop
      />
    </div>
  )
}
