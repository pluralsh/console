package core

import (
	"bytes"
	"context"
	"io"
	"net"
	"net/http"
	"strings"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// sandboxHTTP fakes the daemon's HTTP side: a preview endpoint and a terminal WebSocket that echoes raw bytes
// after switching protocols.
func sandboxHTTP(t *testing.T) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/preview/3000/hello", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("ate-target-actor") != testAtespace+"/dbx-inst-1" {
			http.Error(w, "wrong actor", http.StatusBadRequest)
			return
		}
		w.Header().Set("X-Query", r.URL.RawQuery)
		_, _ = io.WriteString(w, "hi from preview")
	})
	mux.HandleFunc("/terminals/t1/ws", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") == "" {
			http.Error(w, "upgrade required", http.StatusBadRequest)
			return
		}
		conn, rw, err := http.NewResponseController(w).Hijack()
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close()
		_, _ = rw.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
		_ = rw.Flush()
		buf := make([]byte, 1024)
		for {
			n, err := rw.Read(buf)
			if n > 0 {
				_, _ = rw.Write(append([]byte("echo:"), buf[:n]...))
				_ = rw.Flush()
			}
			if err != nil {
				return
			}
		}
	})
	// VNC is a binary WebSocket. Echo the negotiated subprotocol and the raw frames.
	mux.HandleFunc("/browser/vnc", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") == "" {
			http.Error(w, "upgrade required", http.StatusBadRequest)
			return
		}
		conn, rw, err := http.NewResponseController(w).Hijack()
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close()
		_, _ = rw.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n")
		if proto := r.Header.Get("Sec-WebSocket-Protocol"); proto != "" {
			_, _ = rw.WriteString("Sec-WebSocket-Protocol: " + proto + "\r\n")
		}
		_, _ = rw.WriteString("\r\n")
		_ = rw.Flush()
		buf := make([]byte, 1024)
		for {
			n, err := rw.Read(buf)
			if n > 0 {
				_, _ = rw.Write(buf[:n])
				_ = rw.Flush()
			}
			if err != nil {
				return
			}
		}
	})
	return mux
}

func gatewayClient(t *testing.T, g *Gateway) devboxv1.GatewayClient {
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	g.Register(srv)
	go func() { _ = srv.Serve(lis) }()
	conn, err := grpc.NewClient("passthrough:///gw",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = conn.Close()
		srv.Stop()
	})
	return devboxv1.NewGatewayClient(conn)
}

func streamCtx(instance, stream string) context.Context {
	return metadata.AppendToOutgoingContext(context.Background(), devboxv1.InstanceIDMetadataKey, instance, devboxv1.StreamIDMetadataKey, stream)
}

func TestProxyStreamPreview(t *testing.T) {
	h := newHarness(t, sandboxHTTP(t))
	h.running("inst-1")
	gc := gatewayClient(t, h.g)

	open, err := gc.OpenStream(context.Background(), &devboxv1.OpenStreamRequest{InstanceId: "inst-1", Kind: devboxv1.StreamKind_STREAM_KIND_PREVIEW, Port: 3000})
	if err != nil {
		t.Fatal(err)
	}
	if open.GetDaemonPath() != "/preview/3000/" || open.GetStreamId() == "" {
		t.Fatalf("OpenStream = %v", open)
	}

	stream, err := gc.ProxyStream(streamCtx("inst-1", open.GetStreamId()))
	if err != nil {
		t.Fatal(err)
	}
	if err := stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Header_{Header: &devboxv1.HttpRequest_Header{
		Request: &devboxv1.HttpRequestLine{Method: "GET", UrlPath: "/hello", Query: map[string]*devboxv1.MetadataValues{"a": {Value: []string{"1"}}}},
	}}}); err != nil {
		t.Fatal(err)
	}
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Trailer_{Trailer: &devboxv1.HttpRequest_Trailer{}}})
	_ = stream.CloseSend()

	var body string
	var code int32
	var query string
	trailer := false
	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		switch m := msg.GetMessage().(type) {
		case *devboxv1.HttpResponse_Header_:
			code = m.Header.GetResponse().GetStatusCode()
			query = m.Header.GetResponse().GetHeader()["X-Query"].GetValue()[0]
		case *devboxv1.HttpResponse_Data_:
			body += string(m.Data.GetData())
		case *devboxv1.HttpResponse_Trailer_:
			trailer = true
		}
	}
	if code != 200 || body != "hi from preview" || !trailer || query != "a=1" {
		t.Fatalf("code=%d body=%q trailer=%v query=%q", code, body, trailer, query)
	}

	// Stream IDs are bound to their instance.
	bad, _ := gc.ProxyStream(streamCtx("other", open.GetStreamId()))
	_ = bad.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Header_{Header: &devboxv1.HttpRequest_Header{Request: &devboxv1.HttpRequestLine{Method: "GET"}}}})
	if _, err := bad.Recv(); status.Code(err) != codes.NotFound {
		t.Fatalf("foreign stream = %v", err)
	}
}

func TestProxyStreamTerminalUpgrade(t *testing.T) {
	h := newHarness(t, sandboxHTTP(t))
	h.running("inst-1")
	gc := gatewayClient(t, h.g)

	open, err := gc.OpenStream(context.Background(), &devboxv1.OpenStreamRequest{InstanceId: "inst-1", Kind: devboxv1.StreamKind_STREAM_KIND_TERMINAL})
	if err != nil {
		t.Fatal(err)
	}
	if open.GetDaemonPath() != "/terminals/t1/ws" || open.GetTerminal().GetTerminalId() != "t1" {
		t.Fatalf("OpenStream = %v", open)
	}
	ctx, cancel := context.WithCancel(streamCtx("inst-1", open.GetStreamId()))
	defer cancel()
	stream, err := gc.ProxyStream(ctx)
	if err != nil {
		t.Fatal(err)
	}
	zero := int64(0)
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Header_{Header: &devboxv1.HttpRequest_Header{
		Request: &devboxv1.HttpRequestLine{Method: "GET", UrlPath: "/ignored", Header: map[string]*devboxv1.MetadataValues{
			"Connection": {Value: []string{"Upgrade"}}, "Upgrade": {Value: []string{"websocket"}},
		}},
		ContentLength: &zero,
	}}})
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Trailer_{Trailer: &devboxv1.HttpRequest_Trailer{}}})

	msg, err := stream.Recv()
	if err != nil || msg.GetHeader().GetResponse().GetStatusCode() != http.StatusSwitchingProtocols {
		t.Fatalf("header = %v, %v", msg, err)
	}
	if msg, err = stream.Recv(); err != nil || msg.GetTrailer() == nil {
		t.Fatalf("trailer = %v, %v", msg, err)
	}
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_UpgradeData_{UpgradeData: &devboxv1.HttpRequest_UpgradeData{Data: []byte("ls\n")}}})
	got := ""
	for got != "echo:ls\n" {
		msg, err := stream.Recv()
		if err != nil {
			t.Fatalf("after %q: %v", got, err)
		}
		got += string(msg.GetUpgradeData().GetData())
	}
	_ = stream.CloseSend()
	for {
		if _, err := stream.Recv(); err != nil {
			break
		}
	}
}

func TestOpenStreamMarksVoxlStreams(t *testing.T) {
	h := newHarness(t, sandboxHTTP(t))
	h.running("inst-1")
	gc := gatewayClient(t, h.g)
	open := func() *devboxv1.OpenStreamResponse {
		t.Helper()
		resp, err := gc.OpenStream(context.Background(), &devboxv1.OpenStreamRequest{InstanceId: "inst-1", Kind: devboxv1.StreamKind_STREAM_KIND_VNC})
		if err != nil {
			t.Fatal(err)
		}
		return resp
	}
	if vnc := open(); len(vnc.GetSubprotocols()) != 0 {
		t.Fatalf("a VNC stream carries subprotocols %v", vnc.GetSubprotocols())
	}
	h.daemon.browserPath = devboxv1.BrowserStreamPath
	voxl := open()
	if voxl.GetDaemonPath() != devboxv1.BrowserStreamPath || len(voxl.GetSubprotocols()) != 1 || voxl.GetSubprotocols()[0] != "voxl" {
		t.Fatalf("OpenStream = %v", voxl)
	}
}

func TestProxyStreamVNC(t *testing.T) {
	h := newHarness(t, sandboxHTTP(t))
	h.running("inst-1")
	gc := gatewayClient(t, h.g)

	open, err := gc.OpenStream(context.Background(), &devboxv1.OpenStreamRequest{
		InstanceId:   "inst-1",
		Kind:         devboxv1.StreamKind_STREAM_KIND_VNC,
		StartBrowser: &devboxv1.StartBrowserRequest{Url: "http://localhost:3000"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if open.GetDaemonPath() != "/browser/vnc" || open.GetStreamId() == "" || !open.GetBrowser().GetRunning() {
		t.Fatalf("OpenStream = %v", open)
	}

	ctx, cancel := context.WithCancel(streamCtx("inst-1", open.GetStreamId()))
	defer cancel()
	stream, err := gc.ProxyStream(ctx)
	if err != nil {
		t.Fatal(err)
	}
	zero := int64(0)
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Header_{Header: &devboxv1.HttpRequest_Header{
		Request: &devboxv1.HttpRequestLine{Method: "GET", Header: map[string]*devboxv1.MetadataValues{
			"Connection":             {Value: []string{"Upgrade"}},
			"Upgrade":                {Value: []string{"websocket"}},
			"Sec-WebSocket-Protocol": {Value: []string{"binary"}},
		}},
		ContentLength: &zero,
	}}})
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_Trailer_{Trailer: &devboxv1.HttpRequest_Trailer{}}})

	msg, err := stream.Recv()
	if err != nil || msg.GetHeader().GetResponse().GetStatusCode() != http.StatusSwitchingProtocols {
		t.Fatalf("header = %v, %v", msg, err)
	}
	if got := metadataValue(msg.GetHeader().GetResponse().GetHeader(), "Sec-WebSocket-Protocol"); got != "binary" {
		t.Fatalf("Sec-WebSocket-Protocol = %q", got)
	}
	if msg, err = stream.Recv(); err != nil || msg.GetTrailer() == nil {
		t.Fatalf("trailer = %v, %v", msg, err)
	}
	frame := []byte{0x00, 0xff, 0x01, 0x10}
	_ = stream.Send(&devboxv1.HttpRequest{Message: &devboxv1.HttpRequest_UpgradeData_{UpgradeData: &devboxv1.HttpRequest_UpgradeData{Data: frame}}})
	var got []byte
	for len(got) < len(frame) {
		msg, err := stream.Recv()
		if err != nil {
			t.Fatalf("after %v: %v", got, err)
		}
		got = append(got, msg.GetUpgradeData().GetData()...)
	}
	if !bytes.Equal(got, frame) {
		t.Fatalf("frame = %v, want %v", got, frame)
	}
	_ = stream.CloseSend()
}

func metadataValue(h map[string]*devboxv1.MetadataValues, name string) string {
	for k, v := range h {
		if strings.EqualFold(k, name) && len(v.GetValue()) > 0 {
			return v.GetValue()[0]
		}
	}
	return ""
}
