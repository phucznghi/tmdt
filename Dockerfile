FROM node:24.17.0-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DB_PATH=/app/data/mocvai.sqlite
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node scripts/healthcheck.js http://127.0.0.1:3000/healthz
CMD ["node", "server.js"]
