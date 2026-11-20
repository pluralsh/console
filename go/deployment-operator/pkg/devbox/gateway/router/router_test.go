package router

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/test/bufconn"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

type daemon struct {
	devboxv1.UnimplementedDaemonServer
	md chan metadata.MD
}

func (d *daemon) Health(ctx context.Context, _ *devboxv1.HealthRequest) (*devboxv1.HealthResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	d.md <- md
	return &devboxv1.HealthResponse{Ready: true}, nil
}

func TestDaemonCarriesTargetAndRequestToken(t *testing.T) {
	d := &daemon{md: make(chan metadata.MD, 2)}
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	devboxv1.RegisterDaemonServer(srv, d)
	go func() { _ = srv.Serve(lis) }()
	defer srv.Stop()
	conn, err := grpc.NewClient("passthrough:///router",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()

	r := New(conn, http.DefaultTransport, "http://unused")
	in := metadata.NewIncomingContext(context.Background(), metadata.Pairs(devboxv1.RequestTokenMetadataKey, "tok"))
	if _, err := r.Daemon("ates/dbx-1").Health(in, &devboxv1.HealthRequest{}); err != nil {
		t.Fatal(err)
	}
	md := <-d.md
	if got := md.Get(TargetHeader); len(got) != 1 || got[0] != "ates/dbx-1" {
		t.Fatalf("target = %v", got)
	}
	if got := md.Get(devboxv1.RequestTokenMetadataKey); len(got) != 1 || got[0] != "tok" {
		t.Fatalf("request token = %v", got)
	}

	// Background calls (the gateway's own) carry no token.
	if _, err := r.Daemon("ates/dbx-1").Health(context.Background(), &devboxv1.HealthRequest{}); err != nil {
		t.Fatal(err)
	}
	if got := (<-d.md).Get(devboxv1.RequestTokenMetadataKey); len(got) != 0 {
		t.Fatalf("unexpected token %v", got)
	}
}

func TestHTTPRequestsTargetActor(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(r.Header.Get(TargetHeader) + " " + r.URL.Path))
	}))
	defer srv.Close()
	r := New(nil, http.DefaultTransport, srv.URL)
	req, err := r.NewRequest(context.Background(), "ates/dbx-1", http.MethodGet, "/preview/3000/")
	if err != nil {
		t.Fatal(err)
	}
	resp, err := r.RoundTrip(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	buf := make([]byte, 64)
	n, _ := resp.Body.Read(buf)
	if got := string(buf[:n]); got != "ates/dbx-1 /preview/3000/" {
		t.Fatalf("got %q", got)
	}

	bare, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
	if _, err := r.RoundTrip(bare); err == nil {
		t.Fatal("request without a target actor was sent")
	}
}
