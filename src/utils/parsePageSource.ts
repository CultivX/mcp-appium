import { DOMParser, Element } from '@xmldom/xmldom'

/**
 * ✅ Official XCUIElementTypes that are typically interactable.
 * Based on Apple’s docs and real world use.
 */
const INTERACTABLE_TYPES = new Set([
  'XCUIElementTypeButton',
  'XCUIElementTypeLink',
  'XCUIElementTypeCell',
  'XCUIElementTypeTextField',
  'XCUIElementTypeSecureTextField',
  'XCUIElementTypeTextView',
  'XCUIElementTypeSwitch',
  'XCUIElementTypeSlider',
  'XCUIElementTypePicker',
  'XCUIElementTypeSegmentedControl',
  'XCUIElementTypeTabBar',
  'XCUIElementTypeStepper',
  'XCUIElementTypeDatePicker',
  'XCUIElementTypeKey',
  'XCUIElementTypeAlert',
])

/**
 * ✅ Containers we keep to preserve hierarchy — they can contain other interactables
 */
const CONTAINER_TYPES = new Set([
  'XCUIElementTypeScrollView',
  'XCUIElementTypeTable',
  'XCUIElementTypeCollectionView',
  'XCUIElementTypeWindow',
])

export interface ParsedXCUIElement {
  type?: string
  name?: string
  visible: boolean
  enabled: boolean
  accessible: boolean
  x: number
  y: number
  width: number
  height: number
  children?: ParsedXCUIElement[]
}

/**
 * Recursively parse an XCUIElementType node.
 */
function parseNode(node: Element): ParsedXCUIElement | null {
  const type = node.getAttribute('type') || '' // Ensure type is always a string
  const name = node.getAttribute('name') || node.getAttribute('label') || ''
  const visible = node.getAttribute('visible') !== 'false'
  const enabled = node.getAttribute('enabled') === 'true'
  const accessible = node.getAttribute('accessible') === 'true'
  const x = parseFloat(node.getAttribute('x') || '0')
  const y = parseFloat(node.getAttribute('y') || '0')
  const width = parseFloat(node.getAttribute('width') || '0')
  const height = parseFloat(node.getAttribute('height') || '0')

  // Exclude non-visible nodes entirely
  if (!visible) {
    return null
  }

  // Recurse into child elements, but only include visible children
  const children: ParsedXCUIElement[] = []
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (child && child.nodeType === 1) {
      const parsed = parseNode(child as Element)
      if (parsed) {
        children.push(parsed)
      }
    }
  }

  // Decide whether to keep this node
  const isContainer = CONTAINER_TYPES.has(type || '')
  const isInteractable = INTERACTABLE_TYPES.has(type || '')
  const hasMeaningfulChildren = children.length > 0

  const isRelevant =
    isContainer || isInteractable || accessible || hasMeaningfulChildren

  if (isRelevant) {
    const result: ParsedXCUIElement = {
      type,
      name,
      visible,
      enabled,
      accessible,
      x,
      y,
      width,
      height,
      ...(hasMeaningfulChildren ? { children } : {}),
    }
    return result
  }

  return null
}

/**
 * Entry point — call with raw XML string
 */
export function parseXCUIHierarchy(xml: string): ParsedXCUIElement[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.documentElement

  // Typically <AppiumAUT> or <XCUIElementTypeApplication>
  if (!root) return []
  const parsedRoot = parseNode(root)
  return parsedRoot?.children || []
}
