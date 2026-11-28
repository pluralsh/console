package browser

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"

	"github.com/coder/websocket"
)

// cdpClient is a browser-level Chrome DevTools Protocol connection. Calls may be scoped to a page session
// (Target.attachToTarget with flatten), and events go to whoever is waiting for them.
type cdpClient struct {
	c *websocket.Conn

	mu      sync.Mutex
	next    int
	pending map[int]chan cdpMessage
	waiters []*cdpWaiter
	err     error
	done    chan struct{}
}

type cdpMessage struct {
	ID        int             `json:"id"`
	Method    string          `json:"method"`
	SessionID string          `json:"sessionId"`
	Params    json.RawMessage `json:"params"`
	Result    json.RawMessage `json:"result"`
	Error     *struct {
		Message string `json:"message"`
	} `json:"error"`
}

type cdpWaiter struct {
	method, session string
	ch              chan json.RawMessage
}

// dialCDP connects to Chromium's browser endpoint on its internal port.
func (b *Browser) dialCDP(ctx context.Context) (*cdpClient, error) {
	var version struct {
		URL string `json:"webSocketDebuggerUrl"`
	}
	if err := getJSON(ctx, fmt.Sprintf("http://127.0.0.1:%d/json/version", b.internalCDPPort()), &version); err != nil {
		return nil, err
	}
	c, _, err := websocket.Dial(ctx, version.URL, nil)
	if err != nil {
		return nil, err
	}
	c.SetReadLimit(-1)
	p := &cdpClient{c: c, pending: map[int]chan cdpMessage{}, done: make(chan struct{})}
	go p.read()
	return p, nil
}

func (p *cdpClient) Close() { _ = p.c.CloseNow() }

func (p *cdpClient) read() {
	defer close(p.done)
	for {
		_, data, err := p.c.Read(context.Background())
		if err != nil {
			p.mu.Lock()
			p.err = err
			for _, ch := range p.pending {
				close(ch)
			}
			p.pending = nil
			p.mu.Unlock()
			return
		}
		var m cdpMessage
		if json.Unmarshal(data, &m) != nil {
			continue
		}
		p.mu.Lock()
		if m.ID != 0 {
			if ch, ok := p.pending[m.ID]; ok {
				delete(p.pending, m.ID)
				ch <- m
			}
		} else {
			kept := p.waiters[:0]
			for _, w := range p.waiters {
				if w.method == m.Method && w.session == m.SessionID {
					w.ch <- m.Params
					continue
				}
				kept = append(kept, w)
			}
			p.waiters = kept
		}
		p.mu.Unlock()
	}
}

// call runs method, on the page session when session isn't empty, decoding its result into result.
func (p *cdpClient) call(ctx context.Context, session, method string, params, result any) error {
	p.mu.Lock()
	if p.pending == nil {
		err := p.err
		p.mu.Unlock()
		return fmt.Errorf("devtools connection closed: %w", err)
	}
	p.next++
	id := p.next
	ch := make(chan cdpMessage, 1)
	p.pending[id] = ch
	p.mu.Unlock()

	req := map[string]any{"id": id, "method": method, "params": params}
	if session != "" {
		req["sessionId"] = session
	}
	data, err := json.Marshal(req)
	if err != nil {
		return err
	}
	if err := p.c.Write(ctx, websocket.MessageText, data); err != nil {
		return err
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case m, ok := <-ch:
		if !ok {
			return errors.New("devtools connection closed")
		}
		if m.Error != nil {
			return fmt.Errorf("%s: %s", method, m.Error.Message)
		}
		if result == nil {
			return nil
		}
		return json.Unmarshal(m.Result, result)
	}
}

// on returns a channel receiving the params of the next method event on session. Register it before the call
// that causes the event.
func (p *cdpClient) on(session, method string) <-chan json.RawMessage {
	ch := make(chan json.RawMessage, 1)
	p.mu.Lock()
	p.waiters = append(p.waiters, &cdpWaiter{method: method, session: session, ch: ch})
	p.mu.Unlock()
	return ch
}

type cdpTarget struct {
	ID   string `json:"targetId"`
	Type string `json:"type"`
	URL  string `json:"url"`
}

// pages lists Chromium's tabs.
func (p *cdpClient) pages(ctx context.Context) ([]cdpTarget, error) {
	var res struct {
		Targets []cdpTarget `json:"targetInfos"`
	}
	if err := p.call(ctx, "", "Target.getTargets", map[string]any{}, &res); err != nil {
		return nil, err
	}
	var pages []cdpTarget
	for _, t := range res.Targets {
		if t.Type == "page" {
			pages = append(pages, t)
		}
	}
	return pages, nil
}

func getJSON(ctx context.Context, url string, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: %s", url, resp.Status)
	}
	return json.NewDecoder(resp.Body).Decode(v)
}
