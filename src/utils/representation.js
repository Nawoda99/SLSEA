import crypto from 'node:crypto';

function json(value) {
  return JSON.stringify(value);
}

export function representationTag(value) {
  return `"${crypto.createHash('sha256').update(json(value)).digest('hex')}"`;
}

function matchesEtag(header, tag) {
  return header.split(',').map((value) => value.trim()).some((value) => value === '*' || value === tag || value === `W/${tag}`);
}

export function sendRepresentation(req, res, value, { status = 200, lastModified = new Date() } = {}) {
  const tag = representationTag(value);
  const modified = new Date(lastModified);
  const lastModifiedHeader = modified.toUTCString();
  res.set('ETag', tag);
  res.set('Last-Modified', lastModifiedHeader);
  res.set('Content-Type', 'application/json; charset=utf-8');

  const ifNoneMatch = req.get('If-None-Match');
  const ifModifiedSince = req.get('If-Modified-Since');
  if ((ifNoneMatch && matchesEtag(ifNoneMatch, tag)) || (!ifNoneMatch && ifModifiedSince && Number.isFinite(Date.parse(ifModifiedSince)) && Math.floor(modified.getTime() / 1000) <= Math.floor(Date.parse(ifModifiedSince) / 1000))) {
    return res.status(304).end();
  }
  return res.status(status).send(json(value));
}

export function requireIfMatch(req, currentValue) {
  const supplied = req.get('If-Match');
  const current = representationTag(currentValue);
  return supplied === '*' || (supplied && matchesEtag(supplied, current));
}
