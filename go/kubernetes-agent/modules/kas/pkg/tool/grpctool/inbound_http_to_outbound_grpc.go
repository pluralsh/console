package grpctool

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"

	httpz2 "github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/memz"
	prototool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

var (
	// See https://httpwg.org/http-core/draft-ietf-httpbis-semantics-latest.html#field.connection
	// See https://datatracker.ietf.org/doc/html/rfc2616#section-13.5.1
	// See https://github.com/golang/go/blob/81ea89adf38b90c3c3a8c4eed9e6c093a8634d59/src/net/http/httputil/reverseproxy.go#L169-L184
	// Must be in canonical form.
	hopHeaders = []string{
		httpz2.ConnectionHeader,
		httpz2.ProxyConnectionHeader,
		httpz2.KeepAliveHeader,
		httpz2.ProxyAuthenticateHeader,
		httpz2.ProxyAuthorizationHeader,
		httpz2.TeHeader,
		httpz2.TrailerHeader,
		httpz2.TransferEncodingHeader,
		httpz2.UpgradeHeader,
	}

	// errEarlyExit is a sentinel error value to make stream visitor exit early.
	errEarlyExit = errors.New("")
)

type HttpRequestClient interface {
	Send(*HttpRequest) error
	Recv() (*HttpResponse, error)
	grpc.ClientStream
}

type MergeHeadersFunc func(outboundResponse, inboundResponse http.Header)
type WriteErrorResponse func(w http.ResponseWriter, r *http.Request, eResp *ErrResp)

type ErrResp struct {
	StatusCode int32
	Msg        string
	// Err can be nil.
	Err error
}

type InboundHttpToOutboundGrpc struct {
	Log                   *zap.Logger
	HandleProcessingError HandleProcessingErrorFunc
	WriteErrorResponse    WriteErrorResponse
	MergeHeaders          MergeHeadersFunc
}

func (x *InboundHttpToOutboundGrpc) Pipe(outboundClient HttpRequestClient, w http.ResponseWriter, r *http.Request, headerExtra proto.Message) {
	// headerExtra can be nil.
	headerWritten, eResp := x.pipe(outboundClient, w, r, headerExtra)
	if eResp != nil {
		if headerWritten {
			// HTTP status has been written already as part of the normal response flow.
			// But then something went wrong and an error happened. To let the client know that something isn't right
			// we have only one thing we can do - abruptly close the connection. To do that we panic with a special
			// error value that the "http" package provides. See its description.
			// If we try to write the status again here, http package would log a warning, which is not nice.
			panic(http.ErrAbortHandler)
		} else {
			x.WriteErrorResponse(w, r, eResp)
		}
	}
}

func (x *InboundHttpToOutboundGrpc) pipe(outboundClient HttpRequestClient, w http.ResponseWriter, r *http.Request,
	headerExtra proto.Message) (bool /* headerWritten */, *ErrResp) {
	// 0. Check if connection upgrade is requested and if connection can be hijacked.
	var hijacker http.Hijacker
	isUpgrade := len(r.Header[httpz2.UpgradeHeader]) > 0
	if isUpgrade {
		// Connection upgrade requested. For that ResponseWriter must support hijacking.
		var ok bool
		hijacker, ok = w.(http.Hijacker)
		if !ok {
			return false, x.handleInternalError("unable to upgrade connection", fmt.Errorf("unable to hijack response: %T does not implement http.Hijacker", w))
		}
	}
	// http.ResponseWriter does not support concurrent request body reads and response writes so
	// consume the request body first and then write the response from remote.
	// See https://github.com/golang/go/issues/15527
	// See https://github.com/golang/go/blob/go1.17.2/src/net/http/server.go#L118-L139

	// 1. Pipe client -> remote
	eResp := x.pipeInboundToOutbound(outboundClient, r, headerExtra)
	if eResp != nil {
		return false, eResp
	}
	if !isUpgrade { // Close outbound connection for writes if it's not an upgraded connection
		eResp = x.sendCloseSend(outboundClient)
		if eResp != nil {
			return false, eResp
		}
	}
	// 2. Pipe remote -> client
	headerWritten, responseStatusCode, eResp := x.pipeOutboundToInbound(outboundClient, w, isUpgrade)
	if eResp != nil {
		return headerWritten, eResp
	}
	// 3. Pipe client <-> remote if connection upgrade is requested
	if !isUpgrade { // nothing to do
		return true, nil
	}
	if responseStatusCode != http.StatusSwitchingProtocols {
		// Remote doesn't want to upgrade the connection
		return true, x.sendCloseSend(outboundClient)
	}
	return true, x.pipeUpgradedConnection(outboundClient, hijacker)
}

func (x *InboundHttpToOutboundGrpc) pipeOutboundToInbound(outboundClient HttpRequestClient, w http.ResponseWriter, isUpgrade bool) (bool, int32, *ErrResp) {
	writeFailed := false
	headerWritten := false
	var responseStatusCode int32
	flush := x.flush(w)
	err := HttpResponseStreamVisitor.Get().Visit(outboundClient,
		WithCallback(HttpResponseHeaderFieldNumber, func(header *HttpResponse_Header) error {
			responseStatusCode = header.Response.StatusCode
			outboundResponse := header.Response.HttpHeader()
			cleanHeader(outboundResponse)
			x.MergeHeaders(outboundResponse, w.Header())
			w.WriteHeader(int(header.Response.StatusCode))
			// NOTE: the HTTP standard library doesn't no-op for a flush when WriteHeader() was already called with a 1xx status code
			// and already flushed. This leads to the response being sent twice once with the correct status code and once with `200 OK`.
			// Thus, we avoid flushing manually for all 1xx responses.
			// This seems to be a regression in Go 1.19, introduced with https://go-review.googlesource.com/c/go/+/269997
			if header.Response.StatusCode >= 200 {
				flush()
			}
			headerWritten = true
			return nil
		}),
		WithCallback(HttpResponseDataFieldNumber, func(data *HttpResponse_Data) error {
			_, err := w.Write(data.Data)
			if err != nil {
				writeFailed = true
				return err
			}
			flush()
			return nil
		}),
		WithCallback(HttpResponseTrailerFieldNumber, func(trailer *HttpResponse_Trailer) error {
			if isUpgrade && responseStatusCode == http.StatusSwitchingProtocols {
				// Successful upgrade.
				return errEarlyExit
			}
			return nil
		}),
		// if it's a successful upgrade, then this field is unreachable because of the early exit above.
		// otherwise, (unsuccessful upgrade or not an upgrade) the remote must not send this field.
		WithNotExpectingToGet(codes.Internal, HttpResponseUpgradeDataFieldNumber),
	)
	if err != nil && err != errEarlyExit { // nolint: errorlint
		if writeFailed {
			// there is likely a connection problem so the client will likely not receive this
			return headerWritten, responseStatusCode, x.handleIoError("failed to write HTTP response", err)
		}
		return headerWritten, responseStatusCode, x.handleIoError("failed to read gRPC response", err)
	}
	return headerWritten, responseStatusCode, nil
}

func (x *InboundHttpToOutboundGrpc) flush(w http.ResponseWriter) func() {
	// ResponseWriter buffers headers and response body writes and that may break use cases like long polling or streaming.
	// Flusher is used so that when HTTP headers and response body chunks are received from the outbound connection,
	// they are flushed to the inbound stream ASAP.
	flusher, ok := w.(http.Flusher)
	if !ok {
		x.Log.Sugar().Warnf("HTTP->gRPC: %T does not implement http.Flusher, cannot flush data to client", w)
		return func() {}
	}
	return flusher.Flush
}

func (x *InboundHttpToOutboundGrpc) pipeInboundToOutbound(outboundClient HttpRequestClient, r *http.Request, headerExtra proto.Message) *ErrResp {
	var extra *anypb.Any
	if headerExtra != nil {
		var err error
		extra, err = anypb.New(headerExtra)
		if err != nil {
			return x.handleInternalError("failed to marshal header extra proto", err)
		}
	}
	eResp := x.send(outboundClient, "failed to send request header", &HttpRequest{
		Message: &HttpRequest_Header_{
			Header: &HttpRequest_Header{
				Request: &prototool2.HttpRequest{
					Method:  r.Method,
					Header:  headerFromHttpRequestHeader(r.Header),
					UrlPath: r.URL.Path,
					Query:   prototool2.UrlValuesToValuesMap(r.URL.Query()),
				},
				Extra:         extra,
				ContentLength: &r.ContentLength,
			},
		},
	})
	if eResp != nil {
		return eResp
	}

	eResp = x.sendRequestBody(outboundClient, r.Body)
	if eResp != nil {
		return eResp
	}
	return x.send(outboundClient, "failed to send trailer", &HttpRequest{
		Message: &HttpRequest_Trailer_{
			Trailer: &HttpRequest_Trailer{},
		},
	})
}

func (x *InboundHttpToOutboundGrpc) sendRequestBody(outboundClient HttpRequestClient, body io.Reader) *ErrResp {
	buffer := memz.Get32k()
	defer memz.Put32k(buffer)
	for {
		n, readErr := body.Read(buffer)
		if n > 0 { // handle n>0 before readErr != nil to ensure any consumed data gets forwarded
			eResp := x.send(outboundClient, "failed to send request data", &HttpRequest{
				Message: &HttpRequest_Data_{
					Data: &HttpRequest_Data{
						Data: buffer[:n],
					},
				},
			})
			if eResp != nil {
				return eResp
			}
		}
		if readErr != nil {
			if readErr == io.EOF { // nolint:errorlint
				break
			}
			// There is likely a connection problem so the client will likely not receive this
			return x.handleIoError("failed to read request body", readErr)
		}
	}
	return nil
}

func (x *InboundHttpToOutboundGrpc) sendCloseSend(outboundClient HttpRequestClient) *ErrResp {
	err := outboundClient.CloseSend()
	if err != nil {
		return x.handleIoError("failed to send close frame", err)
	}
	return nil
}

func (x *InboundHttpToOutboundGrpc) send(client HttpRequestClient, errMsg string, msg *HttpRequest) *ErrResp {
	err := client.Send(msg)
	if err != nil {
		if err == io.EOF { // nolint:errorlint
			_, err = client.Recv()
		}
		return x.handleIoError(errMsg, err)
	}
	return nil
}

func (x *InboundHttpToOutboundGrpc) handleIoError(msg string, err error) *ErrResp {
	msg = "HTTP->gRPC: " + msg
	x.Log.Debug(msg, logz.Error(err))
	return &ErrResp{
		// See https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.3
		StatusCode: http.StatusBadGateway,
		Msg:        msg,
		Err:        err,
	}
}

func (x *InboundHttpToOutboundGrpc) handleInternalError(msg string, err error) *ErrResp {
	msg = "HTTP->gRPC: " + msg
	x.HandleProcessingError(msg, err)
	return &ErrResp{
		// See https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1
		StatusCode: http.StatusInternalServerError,
		Msg:        msg,
		Err:        err,
	}
}

func (x *InboundHttpToOutboundGrpc) pipeUpgradedConnection(outboundClient HttpRequestClient, hijacker http.Hijacker) (errRet *ErrResp) {
	conn, bufrw, err := hijacker.Hijack()
	if err != nil {
		return x.handleInternalError("unable to upgrade connection: error hijacking response", err)
	}
	defer func() {
		err = conn.Close()
		if err != nil && errRet == nil {
			errRet = x.handleIoError("failed to close upgraded connection", err)
		}
	}()
	// Hijack() docs say we are responsible for managing connection deadlines and a deadline may be set already.
	// We clear the read deadline here because we don't know if the client will be sending any data to us soon.
	err = conn.SetReadDeadline(time.Time{})
	if err != nil {
		return x.handleIoError("failed to clear connection read deadline", err)
	}
	// We don't care if a write deadline is set already, we just wrap the connection in a wrapper that
	// will each time set a new deadline before performing an actual write.
	conn = &httpz2.WriteTimeoutConn{
		Conn:    conn,
		Timeout: 20 * time.Second,
	}
	r, err := decoupleReader(bufrw.Reader, conn)
	if err != nil {
		return x.handleIoError("failed to read buffered data", err)
	}
	p := InboundStreamToOutboundStream{
		PipeInboundToOutbound: func() error {
			return x.pipeInboundToOutboundUpgraded(outboundClient, r)
		},
		PipeOutboundToInbound: func() error {
			return x.pipeOutboundToInboundUpgraded(outboundClient, conn)
		},
	}
	err = p.Pipe()
	if err != nil {
		return x.handleIoError("failed to pipe upgraded connection streams", err)
	}
	return nil
}

func (x *InboundHttpToOutboundGrpc) pipeInboundToOutboundUpgraded(outboundClient HttpRequestClient, inboundStream io.Reader) error {
	buffer := memz.Get32k()
	defer memz.Put32k(buffer)
	for {
		n, readErr := inboundStream.Read(buffer)
		if n > 0 { // handle n>0 before readErr != nil to ensure any consumed data gets forwarded
			sendErr := outboundClient.Send(&HttpRequest{
				Message: &HttpRequest_UpgradeData_{
					UpgradeData: &HttpRequest_UpgradeData{
						Data: buffer[:n],
					},
				},
			})
			if sendErr != nil {
				if readErr == io.EOF {
					return nil // the other goroutine will receive the error in RecvMsg()
				}
				return fmt.Errorf("Send(HttpRequest_UpgradeData): %w", sendErr)
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			// There is likely a connection problem so the client will likely not receive this
			return fmt.Errorf("read failed: %w", readErr)
		}
	}
	err := outboundClient.CloseSend()
	if err != nil {
		return fmt.Errorf("failed to send close frame: %w", err)
	}
	return nil
}

func (x *InboundHttpToOutboundGrpc) pipeOutboundToInboundUpgraded(outboundClient HttpRequestClient, inboundStream io.Writer) error {
	var writeFailed bool
	err := HttpResponseStreamVisitor.Get().Visit(outboundClient,
		WithStartState(HttpResponseTrailerFieldNumber),
		WithCallback(HttpResponseUpgradeDataFieldNumber, func(data *HttpResponse_UpgradeData) error {
			_, err := inboundStream.Write(data.Data)
			if err != nil {
				writeFailed = true
			}
			return err
		}),
	)
	if err != nil {
		if writeFailed {
			// there is likely a connection problem so the client will likely not receive this
			return fmt.Errorf("failed to write upgraded HTTP response: %w", err)
		}
		return fmt.Errorf("failed to read upgraded gRPC response: %w", err)
	}
	return nil
}

// decoupleReader returns an io.Reader that is decoupled from the buffered reader, returned by Hijack.
// This is a workaround for https://github.com/golang/go/issues/32314.
func decoupleReader(r *bufio.Reader, conn net.Conn) (io.Reader, error) {
	buffered := r.Buffered()
	if buffered == 0 {
		return conn, nil
	}
	b, err := r.Peek(buffered)
	if err != nil {
		return nil, err
	}
	return io.MultiReader(bytes.NewReader(b), conn), nil
}

func headerFromHttpRequestHeader(header http.Header) map[string]*prototool2.Values {
	header = header.Clone()
	delete(header, httpz2.HostHeader) // Use the destination host name
	cleanHeader(header)
	return prototool2.HttpHeaderToValuesMap(header)
}

func cleanHeader(header http.Header) {
	upgrade := header[httpz2.UpgradeHeader]

	// 1. Remove hop-by-hop headers listed in the Connection header. See https://datatracker.ietf.org/doc/html/rfc7230#section-6.1
	httpz2.RemoveConnectionHeaders(header)
	// 2. Remove well-known hop-by-hop headers
	for _, name := range hopHeaders {
		delete(header, name)
	}
	// 3. Fix up Connection and Upgrade headers if upgrade is requested/confirmed
	if len(upgrade) > 0 {
		header[httpz2.UpgradeHeader] = upgrade                // put it back
		header[httpz2.ConnectionHeader] = []string{"upgrade"} // this discards any other connection options if they were there
	}
}
