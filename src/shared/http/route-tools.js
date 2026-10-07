import { badRequest, preconditionFailed } from '../../middleware/errors.js';
import { requireIfMatch, sendRepresentation } from './representation.js';

export const active = Object.freeze({ deletedAt: null });

export function latestDate(...values) {
  const dates = values.filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((value) => value.getTime()))) : new Date();
}

export function paginationLinks(req, page, limit, total) {
  const links = { self: req.originalUrl };
  const pages = Math.max(1, Math.ceil(total / limit));
  const link = (targetPage) => {
    const url = new URL(req.originalUrl, 'http://localhost');
    url.searchParams.set('page', String(targetPage));
    url.searchParams.set('limit', String(limit));
    return `${url.pathname}${url.search}`;
  };
  if (page > 1) links.previous = link(page - 1);
  if (page < pages) links.next = link(page + 1);
  return links;
}

export function paged(query, req, rows, total) {
  return {
    data: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.max(1, Math.ceil(total / query.limit)),
      links: paginationLinks(req, query.page, query.limit, total)
    }
  };
}

export function locationOf(req, id) {
  return `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}/${id}`;
}

export function assertFutureAllowed(date) {
  if (date.getTime() > Date.now() + 5 * 60 * 1000) throw badRequest('measuredAt cannot be more than five minutes in the future');
}

export function assertIfMatch(req, current) {
  if (!requireIfMatch(req, current)) throw preconditionFailed('If-Match is required and must match the current representation');
}

export { sendRepresentation };
