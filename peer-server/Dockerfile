# PeerJS signaling server (the official image is unmaintained, so build from the npm package).
FROM node:22-slim
WORKDIR /app
RUN npm install --omit=dev --no-audit --no-fund peer@1.0.2 && npm cache clean --force
USER node
EXPOSE 9000
# --path /peerjs matches Caddy's `handle /peerjs*` and the client's NEXT_PUBLIC_PEER_PATH.
CMD ["node_modules/.bin/peerjs", "--port", "9000", "--path", "/peerjs", "--proxied", "true"]
