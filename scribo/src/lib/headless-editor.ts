import { CodeHighlightNode, CodeNode } from '@lexical/code'
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/extension'
import { createHeadlessEditor } from '@lexical/headless'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  type ElementTransformer,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  type Transformer,
  $convertFromMarkdownString as lexicalConvertFromMarkdown,
  $convertToMarkdownString as lexicalConvertToMarkdown,
} from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { ElementNode, LexicalNode } from 'lexical'

export const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (
    parentNode: ElementNode,
    _children: LexicalNode[],
    _match: string[],
    isImport: boolean,
  ) => {
    const line = $createHorizontalRuleNode()
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line)
    } else {
      parentNode.insertBefore(line)
    }
    line.selectNext()
  },
  type: 'element',
}

export const markdownTransformers: Transformer[] = [
  HR,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
]

export function $convertFromMarkdownString({
  markdown,
  transformers = markdownTransformers,
  node,
  shouldPreserveNewLines = true,
  shouldMergeAdjacentLines = false,
}: {
  markdown: string
  transformers?: Transformer[]
  node?: ElementNode
  shouldPreserveNewLines?: boolean
  shouldMergeAdjacentLines?: boolean
}) {
  return lexicalConvertFromMarkdown(
    markdown,
    transformers,
    node,
    shouldPreserveNewLines,
    shouldMergeAdjacentLines,
  )
}

export function $convertToMarkdownString({
  transformers = markdownTransformers,
  node,
  shouldPreserveNewLines = true,
}: {
  transformers?: Transformer[]
  node?: ElementNode
  shouldPreserveNewLines?: boolean
} = {}) {
  return lexicalConvertToMarkdown(transformers, node, shouldPreserveNewLines)
}

export function createMoldableHeadlessEditor() {
  return createHeadlessEditor({
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      AutoLinkNode,
      LinkNode,
      HorizontalRuleNode,
    ],
    theme: {},
    onError: (error) => {
      throw error
    },
  })
}
