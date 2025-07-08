import { parseXCUIHierarchy } from './parsePageSource'

describe('parseXCUIHierarchy', () => {
  it('parses a simple XCUI hierarchy and returns correct types', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <XCUIElementTypeWindow type="XCUIElementTypeWindow" x="0" y="0" width="390" height="844" visible="true" enabled="true">
        <XCUIElementTypeButton type="XCUIElementTypeButton" name="OK" x="10" y="20" width="100" height="40" visible="true" enabled="true" accessible="true" />
      </XCUIElementTypeWindow>`
    const result = parseXCUIHierarchy(xml)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)
    const win = result[0]
    expect(win.type).toBe('XCUIElementTypeWindow')
    expect(win.visible).toBe(true)
    expect(win.enabled).toBe(true)
    expect(win.children).toBeDefined()
    expect(win.children![0].type).toBe('XCUIElementTypeButton')
    expect(win.children![0].name).toBe('OK')
    expect(win.children![0].visible).toBe(true)
    expect(win.children![0].enabled).toBe(true)
    expect(win.children![0].accessible).toBe(true)
  })

  it('handles missing attributes gracefully', () => {
    const xml = `<XCUIElementTypeWindow type="XCUIElementTypeWindow">
      <XCUIElementTypeButton />
    </XCUIElementTypeWindow>`
    const result = parseXCUIHierarchy(xml)
    expect(result[0].type).toBe('XCUIElementTypeWindow')
    expect(result[0].visible).toBe(false)
    expect(result[0].enabled).toBe(false)
    expect(result[0].children![0].type).toBe('XCUIElementTypeButton')
    expect(result[0].children![0].visible).toBe(false)
    expect(result[0].children![0].enabled).toBe(false)
  })

  it('returns an empty array for no children', () => {
    const xml = `<XCUIElementTypeWindow type="XCUIElementTypeWindow" />`
    const result = parseXCUIHierarchy(xml)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('parses deeply nested hierarchies', () => {
    const xml = `<XCUIElementTypeWindow type="XCUIElementTypeWindow">
      <XCUIElementTypeTable type="XCUIElementTypeTable">
        <XCUIElementTypeCell type="XCUIElementTypeCell" name="Cell1" />
        <XCUIElementTypeCell type="XCUIElementTypeCell" name="Cell2" />
      </XCUIElementTypeTable>
    </XCUIElementTypeWindow>`
    const result = parseXCUIHierarchy(xml)
    expect(result[0].type).toBe('XCUIElementTypeWindow')
    expect(result[0].children![0].type).toBe('XCUIElementTypeTable')
    expect(result[0].children![0].children!.length).toBe(2)
    expect(result[0].children![0].children![0].name).toBe('Cell1')
    expect(result[0].children![0].children![1].name).toBe('Cell2')
  })

  it('children are always ParsedXCUIElement[] if present', () => {
    const xml = `<XCUIElementTypeWindow type="XCUIElementTypeWindow">
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="A" />
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="B" />
    </XCUIElementTypeWindow>`
    const result = parseXCUIHierarchy(xml)
    expect(Array.isArray(result[0].children)).toBe(true)
    for (const child of result[0].children!) {
      // TypeScript will enforce this, but we check at runtime too
      expect(typeof child.type).toBe('string')
      expect(typeof child.visible).toBe('boolean')
      expect(typeof child.enabled).toBe('boolean')
    }
  })

  it('excludes non-visible elements at root and as children', () => {
    // Root not visible: should return []
    const xmlRootInvisible = `<XCUIElementTypeWindow type="XCUIElementTypeWindow" visible="false">
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="OK" visible="true" />
    </XCUIElementTypeWindow>`
    const resultRootInvisible = parseXCUIHierarchy(xmlRootInvisible)
    expect(resultRootInvisible).toEqual([])

    // Child not visible: should not appear in children
    const xmlChildInvisible = `<XCUIElementTypeWindow type="XCUIElementTypeWindow" visible="true">
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="OK" visible="false" />
      <XCUIElementTypeButton type="XCUIElementTypeButton" name="YES" visible="true" />
    </XCUIElementTypeWindow>`
    const resultChildInvisible = parseXCUIHierarchy(xmlChildInvisible)
    expect(resultChildInvisible.length).toBe(1)
    expect(resultChildInvisible[0].children!.length).toBe(1)
    expect(resultChildInvisible[0].children![0].name).toBe('YES')
  })
})
