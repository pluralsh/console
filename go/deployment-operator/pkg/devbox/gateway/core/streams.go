package core

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// streamTarget is what OpenStream registered: the only path a stream ID may reach, on one instance.
type streamTarget struct {
	instanceID string
	kind       devboxv1.StreamKind
	path       string
	expiresAt  time.Time
}

type streamRegistry struct {
	mu      sync.Mutex
	targets map[string]streamTarget
}

func newStreamRegistry() *streamRegistry {
	return &streamRegistry{targets: map[string]streamTarget{}}
}

func (r *streamRegistry) add(t streamTarget, now time.Time) string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	id := hex.EncodeToString(b[:])
	r.mu.Lock()
	defer r.mu.Unlock()
	for k, v := range r.targets {
		if now.After(v.expiresAt) {
			delete(r.targets, k)
		}
	}
	r.targets[id] = t
	return id
}

// get returns a stream target. Targets are kept after first use so a browser can reconnect within the token's
// lifetime; console's stream token bounds that.
func (r *streamRegistry) get(id string, now time.Time) (streamTarget, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	t, ok := r.targets[id]
	if !ok || now.After(t.expiresAt) {
		return streamTarget{}, false
	}
	return t, true
}

func (r *streamRegistry) dropInstance(instanceID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for k, v := range r.targets {
		if v.instanceID == instanceID {
			delete(r.targets, k)
		}
	}
}

// OpenStream prepares a terminal, VNC or preview target and registers it under a fresh stream ID (DBX-33).
func (g *Gateway) OpenStream(ctx context.Context, req *devboxv1.OpenStreamRequest) (*devboxv1.OpenStreamResponse, error) {
	_, d, err := g.running(ctx, req.GetInstanceId(), req.GetResumeIfSuspended())
	if err != nil {
		return nil, err
	}
	resp := &devboxv1.OpenStreamResponse{Kind: req.GetKind()}
	switch req.GetKind() {
	case devboxv1.StreamKind_STREAM_KIND_TERMINAL:
		id := req.GetTerminalId()
		if id == "" {
			create := req.GetCreateTerminal()
			if create == nil {
				create = &devboxv1.CreateTerminalRequest{}
			}
			create.InstanceId = req.GetInstanceId()
			if create.CreatedBy == nil {
				create.CreatedBy = req.GetRequestedBy()
			}
			term, err := d.CreateTerminal(ctx, create)
			if err != nil {
				return nil, err
			}
			resp.Terminal = term
			id = term.GetTerminalId()
		}
		resp.DaemonPath = "/terminals/" + url.PathEscape(id) + "/ws"
	case devboxv1.StreamKind_STREAM_KIND_VNC:
		var browser *devboxv1.BrowserInfo
		if sb := req.GetStartBrowser(); sb != nil {
			sb.InstanceId = req.GetInstanceId()
			browser, err = d.StartBrowser(ctx, sb)
		} else {
			browser, err = d.GetBrowser(ctx, &devboxv1.GetBrowserRequest{InstanceId: req.GetInstanceId()})
			if err == nil && !browser.GetRunning() {
				browser, err = d.StartBrowser(ctx, &devboxv1.StartBrowserRequest{InstanceId: req.GetInstanceId()})
			}
		}
		if err != nil {
			return nil, err
		}
		resp.Browser = browser
		resp.DaemonPath = browser.GetVncPath()
		if resp.DaemonPath == "" {
			resp.DaemonPath = "/browser/vnc"
		}
	case devboxv1.StreamKind_STREAM_KIND_PREVIEW:
		if req.GetPort() <= 0 || req.GetPort() > 65535 {
			return nil, status.Errorf(codes.InvalidArgument, "invalid preview port %d", req.GetPort())
		}
		resp.DaemonPath = fmt.Sprintf("/preview/%d/", req.GetPort())
	default:
		return nil, status.Errorf(codes.InvalidArgument, "unsupported stream kind %s", req.GetKind())
	}
	expires := g.now().Add(g.cfg.StreamTokenTTL)
	resp.StreamId = g.streams.add(streamTarget{instanceID: req.GetInstanceId(), kind: req.GetKind(), path: resp.DaemonPath, expiresAt: expires}, g.now())
	resp.ExpiresAt = timestamppb.New(expires)
	return resp, nil
}

// ProxyStream carries one browser WebSocket (or preview HTTP request) to the daemon through atenet-router, as
// HTTP-over-gRPC: header, data*, trailer, then upgrade data both ways after a 101.
func (g *Gateway) ProxyStream(stream devboxv1.Gateway_ProxyStreamServer) error {
	ctx := stream.Context()
	md, _ := metadata.FromIncomingContext(ctx)
	instanceID := firstMD(md, devboxv1.InstanceIDMetadataKey)
	streamID := firstMD(md, devboxv1.StreamIDMetadataKey)
	target, ok := g.streams.get(streamID, g.now())
	if !ok || target.instanceID != instanceID {
		return status.Errorf(codes.NotFound, "unknown or expired stream %q", streamID)
	}
	inst, _, err := g.running(ctx, instanceID, true)
	if err != nil {
		return err
	}

	first, err := stream.Recv()
	if err != nil {
		return err
	}
	header := first.GetHeader()
	if header == nil || header.GetRequest() == nil {
		return status.Error(codes.InvalidArgument, "the first ProxyStream frame must be a header")
	}
	req, err := g.proxyRequest(ctx, inst, target, header.GetRequest())
	if err != nil {
		return err
	}
	upgrade := isUpgrade(req.Header)
	var bodyW *io.PipeWriter
	hasBody := header.GetContentLength() != 0
	if header.ContentLength == nil {
		hasBody = req.Method != http.MethodGet && req.Method != http.MethodHead
	}
	if !upgrade && hasBody {
		pr, pw := io.Pipe()
		bodyW = pw
		req.Body = pr
		req.ContentLength = -1
		if header.GetContentLength() > 0 {
			req.ContentLength = header.GetContentLength()
		}
		defer pr.Close() // nolint: errcheck
	}

	// Inbound frames: request body until the trailer, then upgrade data once the daemon switched protocols.
	upgradeConn := make(chan io.Writer, 1)
	recvDone := make(chan error, 1)
	go func() {
		recvDone <- pipeInbound(stream, bodyW, upgradeConn)
	}()

	resp, err := g.deps.Router.RoundTrip(req)
	if err != nil {
		return status.Errorf(codes.Unavailable, "proxying to the daemon: %v", err)
	}
	defer resp.Body.Close() // nolint: errcheck
	if err := stream.Send(&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Header_{Header: &devboxv1.HttpResponse_Header{
		Response: &devboxv1.HttpResponseLine{StatusCode: int32(resp.StatusCode), Status: resp.Status, Header: toValues(resp.Header)},
	}}}); err != nil {
		return err
	}
	switched := upgrade && resp.StatusCode == http.StatusSwitchingProtocols
	if !switched {
		if err := copyFrames(resp.Body, func(b []byte) error {
			return stream.Send(&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Data_{Data: &devboxv1.HttpResponse_Data{Data: b}}})
		}); err != nil {
			return err
		}
	}
	if err := stream.Send(&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_Trailer_{Trailer: &devboxv1.HttpResponse_Trailer{}}}); err != nil {
		return err
	}
	if !switched {
		close(upgradeConn)
		return nil
	}
	rw, ok := resp.Body.(io.ReadWriteCloser)
	if !ok {
		return status.Error(codes.Internal, "the daemon switched protocols without a writable connection")
	}
	upgradeConn <- rw
	sendDone := make(chan error, 1)
	go func() {
		sendDone <- copyFrames(rw, func(b []byte) error {
			return stream.Send(&devboxv1.HttpResponse{Message: &devboxv1.HttpResponse_UpgradeData_{UpgradeData: &devboxv1.HttpResponse_UpgradeData{Data: b}}})
		})
	}()
	select {
	case err := <-sendDone:
		return err
	case err := <-recvDone:
		// The client went away; closing the connection ends the daemon side.
		_ = rw.Close()
		<-sendDone
		if errors.Is(err, io.EOF) {
			return nil
		}
		return err
	case <-ctx.Done():
		_ = rw.Close()
		return status.FromContextError(ctx.Err()).Err()
	}
}

// proxyRequest builds the daemon request for a ProxyStream's request line, confined to the stream's target path.
func (g *Gateway) proxyRequest(ctx context.Context, inst *Instance, target streamTarget, line *devboxv1.HttpRequestLine) (*http.Request, error) {
	path := target.path
	if target.kind == devboxv1.StreamKind_STREAM_KIND_PREVIEW {
		suffix := strings.TrimPrefix(line.GetUrlPath(), "/")
		if strings.Contains(suffix, "..") {
			return nil, status.Error(codes.InvalidArgument, "invalid preview path")
		}
		path = strings.TrimSuffix(path, "/") + "/" + suffix
	}
	if q := valuesOf(line.GetQuery()); len(q) > 0 {
		path += "?" + url.Values(q).Encode()
	}
	method := line.GetMethod()
	if method == "" {
		method = http.MethodGet
	}
	req, err := g.deps.Router.NewRequest(ctx, inst.ActorID(), method, path)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "%v", err)
	}
	for k, vs := range valuesOf(line.GetHeader()) {
		if strings.EqualFold(k, "Host") || strings.EqualFold(k, "Content-Length") {
			continue
		}
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	return req, nil
}

func pipeInbound(stream devboxv1.Gateway_ProxyStreamServer, body *io.PipeWriter, upgradeConn <-chan io.Writer) error {
	closeBody := func() {
		if body != nil {
			_ = body.Close()
			body = nil
		}
	}
	defer closeBody()
	var conn io.Writer
	for {
		msg, err := stream.Recv()
		if err != nil {
			if body != nil && !errors.Is(err, io.EOF) {
				_ = body.CloseWithError(err)
				body = nil
			}
			return err
		}
		switch m := msg.GetMessage().(type) {
		case *devboxv1.HttpRequest_Data_:
			if body == nil {
				return status.Error(codes.InvalidArgument, "unexpected request body")
			}
			if _, err := body.Write(m.Data.GetData()); err != nil {
				return err
			}
		case *devboxv1.HttpRequest_Trailer_:
			closeBody()
		case *devboxv1.HttpRequest_UpgradeData_:
			if conn == nil {
				c, ok := <-upgradeConn
				if !ok || c == nil {
					return status.Error(codes.InvalidArgument, "upgrade data without a protocol switch")
				}
				conn = c
			}
			if _, err := conn.Write(m.UpgradeData.GetData()); err != nil {
				return err
			}
		default:
			return status.Error(codes.InvalidArgument, "unexpected ProxyStream frame")
		}
	}
}

func copyFrames(r io.Reader, send func([]byte) error) error {
	buf := make([]byte, 32*1024)
	for {
		n, err := r.Read(buf)
		if n > 0 {
			if serr := send(buf[:n]); serr != nil {
				return serr
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
	}
}

func isUpgrade(h http.Header) bool {
	if h.Get("Upgrade") == "" {
		return false
	}
	for _, v := range h.Values("Connection") {
		for _, tok := range strings.Split(v, ",") {
			if strings.EqualFold(strings.TrimSpace(tok), "upgrade") {
				return true
			}
		}
	}
	return false
}

func valuesOf(m map[string]*devboxv1.MetadataValues) map[string][]string {
	out := make(map[string][]string, len(m))
	for k, v := range m {
		out[k] = v.GetValue()
	}
	return out
}

func toValues(h http.Header) map[string]*devboxv1.MetadataValues {
	out := make(map[string]*devboxv1.MetadataValues, len(h))
	for k, v := range h {
		out[k] = &devboxv1.MetadataValues{Value: v}
	}
	return out
}

func firstMD(md metadata.MD, key string) string {
	if v := md.Get(key); len(v) > 0 {
		return v[0]
	}
	return ""
}
