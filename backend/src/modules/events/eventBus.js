const clients = new Set();

function send(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.flush?.();
}

export function addEventClient(req, res) {
  const client = { res, userId: req.user.id, role: req.user.role };
  clients.add(client);

  send(res, "connected", {
    scope: "system",
    userId: req.user.id,
    timestamp: new Date().toISOString(),
  });

  req.on("close", () => {
    clients.delete(client);
  });
}

export function broadcastPlatformEvent(scope, action, payload = {}) {
  const eventPayload = {
    scope,
    action,
    payload,
    timestamp: new Date().toISOString(),
  };

  for (const client of clients) {
    send(client.res, "platform", eventPayload);
  }
}
