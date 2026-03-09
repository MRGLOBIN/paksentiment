# ── Stage 1: Build ──
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o colly-sidecar main.go

# ── Stage 2: Production ──
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/colly-sidecar .
EXPOSE 8081
CMD ["./colly-sidecar"]
