package browser

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

// pickTimeout bounds how long a viewer can leave the page in inspect mode.
const pickTimeout = 5 * time.Minute

// PickedElement describes the element a viewer picked in the box's browser, for a prompt to reference.
type PickedElement struct {
	URL      string `json:"url"`
	Title    string `json:"title,omitempty"`
	Selector string `json:"selector"`
	Tag      string `json:"tag"`
	Text     string `json:"text,omitempty"`
	HTML     string `json:"html,omitempty"`
}

// describeElement runs on the picked node: a selector that matches only it (ids and test ids first, then
// positions), its text, and its markup trimmed for a prompt.
const describeElement = `function () {
  const el = this.nodeType === 1 ? this : this.parentElement
  const unique = (s) => { try { return document.querySelectorAll(s).length === 1 } catch { return false } }
  const quoted = (v) => '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  const step = (e) => {
    if (e.id && unique('#' + CSS.escape(e.id))) return { s: '#' + CSS.escape(e.id), done: true }
    for (const a of ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa']) {
      const v = e.getAttribute(a)
      if (v) return { s: e.localName + '[' + a + '=' + quoted(v) + ']' }
    }
    for (const a of ['name', 'aria-label']) {
      const v = e.getAttribute(a)
      if (v) return { s: e.localName + '[' + a + '=' + quoted(v) + ']' }
    }
    const p = e.parentElement
    const same = p ? [...p.children].filter((c) => c.localName === e.localName) : []
    return { s: same.length > 1 ? e.localName + ':nth-of-type(' + (same.indexOf(e) + 1) + ')' : e.localName }
  }
  const parts = []
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    const { s, done } = step(e)
    parts.unshift(s)
    if (done || unique(parts.join(' > '))) break
  }
  const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
  let html = el.outerHTML
  if (html.length > 2000) html = html.slice(0, 2000) + '…'
  return {
    url: location.href,
    title: document.title,
    selector: parts.join(' > '),
    tag: el.localName,
    text: text.length > 300 ? text.slice(0, 300) + '…' : text,
    html,
  }
}`

var inspectHighlight = map[string]any{
	"showInfo":              true,
	"showAccessibilityInfo": true,
	"contentColor":          map[string]any{"r": 74, "g": 146, "b": 255, "a": 0.25},
	"paddingColor":          map[string]any{"r": 74, "g": 146, "b": 255, "a": 0.12},
	"borderColor":           map[string]any{"r": 74, "g": 146, "b": 255, "a": 0.9},
	"marginColor":           map[string]any{"r": 255, "g": 180, "b": 0, "a": 0.12},
}

// pickElement puts the visible tab in Chromium's inspect mode, which highlights what's under the pointer, and
// describes the element the viewer clicks. ctx ending cancels the pick.
func (b *Browser) pickElement(ctx context.Context) (*PickedElement, error) {
	ctx, cancel := context.WithTimeout(ctx, pickTimeout)
	defer cancel()
	cdp, err := b.dialCDP(ctx)
	if err != nil {
		return nil, err
	}
	defer cdp.Close()
	session, err := visiblePage(ctx, cdp)
	if err != nil {
		return nil, err
	}
	picked := cdp.on(session, "Overlay.inspectNodeRequested")
	for _, step := range []struct {
		method string
		params map[string]any
	}{
		{"DOM.enable", map[string]any{}},
		{"Overlay.enable", map[string]any{}},
		{"Overlay.setInspectMode", map[string]any{"mode": "searchForNode", "highlightConfig": inspectHighlight}},
	} {
		if err := cdp.call(ctx, session, step.method, step.params, nil); err != nil {
			return nil, err
		}
	}
	defer func() {
		// the page stays in inspect mode after the pick unless it's turned off
		off, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = cdp.call(off, session, "Overlay.setInspectMode", map[string]any{"mode": "none", "highlightConfig": map[string]any{}}, nil)
	}()

	var node struct {
		BackendNodeID int `json:"backendNodeId"`
	}
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-cdp.done:
		return nil, errors.New("the browser closed")
	case params := <-picked:
		if err := json.Unmarshal(params, &node); err != nil {
			return nil, err
		}
	}
	var resolved struct {
		Object struct {
			ObjectID string `json:"objectId"`
		} `json:"object"`
	}
	if err := cdp.call(ctx, session, "DOM.resolveNode", map[string]any{"backendNodeId": node.BackendNodeID}, &resolved); err != nil {
		return nil, err
	}
	var described struct {
		Result struct {
			Value PickedElement `json:"value"`
		} `json:"result"`
		Exception *struct {
			Text string `json:"text"`
		} `json:"exceptionDetails"`
	}
	if err := cdp.call(ctx, session, "Runtime.callFunctionOn", map[string]any{
		"objectId": resolved.Object.ObjectID, "functionDeclaration": describeElement, "returnByValue": true,
	}, &described); err != nil {
		return nil, err
	}
	if described.Exception != nil {
		return nil, errors.New("describe the element: " + described.Exception.Text)
	}
	return &described.Result.Value, nil
}

// visiblePage attaches to the tab on screen: the one whose document is visible, else the first.
func visiblePage(ctx context.Context, cdp *cdpClient) (string, error) {
	pages, err := cdp.pages(ctx)
	if err != nil {
		return "", err
	}
	if len(pages) == 0 {
		return "", errors.New("the browser has no open tab")
	}
	first := ""
	for _, p := range pages {
		var attached struct {
			SessionID string `json:"sessionId"`
		}
		if err := cdp.call(ctx, "", "Target.attachToTarget", map[string]any{"targetId": p.ID, "flatten": true}, &attached); err != nil {
			continue
		}
		if first == "" {
			first = attached.SessionID
		}
		var visible struct {
			Result struct {
				Value string `json:"value"`
			} `json:"result"`
		}
		err := cdp.call(ctx, attached.SessionID, "Runtime.evaluate", map[string]any{"expression": "document.visibilityState", "returnByValue": true}, &visible)
		if err == nil && visible.Result.Value == "visible" {
			return attached.SessionID, nil
		}
	}
	if first == "" {
		return "", errors.New("couldn't attach to the browser's tabs")
	}
	return first, nil
}
