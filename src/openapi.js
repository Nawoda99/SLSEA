export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'SLSEA Solar Generation Data API',
    version: '1.0.0',
    description: 'Level 2 REST API for synthetic and operationally shaped solar generation data. Device tokens are ingestion-only; SLSEA user tokens are read-only unless the separately disabled maintenance capability is enabled.'
  },
  servers: [{ url: 'http://localhost:8080', description: 'Local development' }],
  tags: [
    { name: 'Authentication' }, { name: 'Geography' }, { name: 'Installations' }, { name: 'Readings' }, { name: 'Summaries' }, { name: 'Maintenance' }
  ],
  paths: {
    '/health': { get: { tags: ['Authentication'], security: [], responses: { 200: { description: 'Process is alive' } } } },
    '/ready': { get: { tags: ['Authentication'], security: [], responses: { 200: { description: 'Database is reachable' }, 503: { '$ref': '#/components/responses/Error' } } } },
    '/api/v1/auth/users/login': { post: { tags: ['Authentication'], security: [], requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserLogin' } } } }, responses: { 200: { description: 'User token' }, 401: { '$ref': '#/components/responses/Error' } } } },
    '/api/v1/auth/installations/token': { post: { tags: ['Authentication'], security: [], requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/DeviceLogin' } } } }, responses: { 200: { description: 'Installation token' }, 401: { '$ref': '#/components/responses/Error' } } } },
    '/api/v1/provinces': { get: { tags: ['Geography'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }], responses: { 200: { '$ref': '#/components/responses/ProvincePage' }, 401: { '$ref': '#/components/responses/Error' } } }, post: { tags: ['Maintenance'], security: [{ bearerAuth: [] }], requestBody: { '$ref': '#/components/requestBodies/Province' }, responses: { 201: { description: 'Created' }, 403: { '$ref': '#/components/responses/Error' } } } },
    '/api/v1/provinces/{provinceId}': { parameters: [{ '$ref': '#/components/parameters/ProvinceId' }], get: { tags: ['Geography'], security: [{ bearerAuth: [] }], responses: { 200: { '$ref': '#/components/responses/Province' }, 404: { '$ref': '#/components/responses/Error' } } }, put: { '$ref': '#/components/pathItems/MetadataPut' }, patch: { '$ref': '#/components/pathItems/MetadataPatch' }, delete: { '$ref': '#/components/pathItems/MetadataDelete' } },
    '/api/v1/provinces/{provinceId}/districts': { get: { tags: ['Geography'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/ProvinceId' }, { '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }], responses: { 200: { '$ref': '#/components/responses/DistrictPage' } } } },
    '/api/v1/districts': { get: { tags: ['Geography'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }], responses: { 200: { '$ref': '#/components/responses/DistrictPage' } } }, post: { '$ref': '#/components/pathItems/MetadataPost' } },
    '/api/v1/districts/{districtId}': { parameters: [{ '$ref': '#/components/parameters/DistrictId' }], get: { tags: ['Geography'], security: [{ bearerAuth: [] }], responses: { 200: { '$ref': '#/components/responses/District' }, 404: { '$ref': '#/components/responses/Error' } } }, put: { '$ref': '#/components/pathItems/MetadataPut' }, patch: { '$ref': '#/components/pathItems/MetadataPatch' }, delete: { '$ref': '#/components/pathItems/MetadataDelete' } },
    '/api/v1/districts/{districtId}/grid-substations': { get: { tags: ['Geography'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/DistrictId' }, { '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }], responses: { 200: { '$ref': '#/components/responses/SubstationPage' } } } },
    '/api/v1/grid-substations': { get: { tags: ['Geography'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }], responses: { 200: { '$ref': '#/components/responses/SubstationPage' } } }, post: { '$ref': '#/components/pathItems/MetadataPost' } },
    '/api/v1/grid-substations/{substationId}': { parameters: [{ '$ref': '#/components/parameters/SubstationId' }], get: { tags: ['Geography'], security: [{ bearerAuth: [] }], responses: { 200: { '$ref': '#/components/responses/Substation' } } }, put: { '$ref': '#/components/pathItems/MetadataPut' }, patch: { '$ref': '#/components/pathItems/MetadataPatch' }, delete: { '$ref': '#/components/pathItems/MetadataDelete' } },
    '/api/v1/grid-substations/{substationId}/installations': { get: { tags: ['Installations'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/SubstationId' }, { '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }], responses: { 200: { '$ref': '#/components/responses/InstallationPage' } } } },
    '/api/v1/installations': { get: { tags: ['Installations'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }, { '$ref': '#/components/parameters/ProvinceFilter' }, { '$ref': '#/components/parameters/DistrictFilter' }, { '$ref': '#/components/parameters/SubstationFilter' }], responses: { 200: { '$ref': '#/components/responses/InstallationPage' } } }, post: { '$ref': '#/components/pathItems/MetadataPost' } },
    '/api/v1/installations/{installationId}': { parameters: [{ '$ref': '#/components/parameters/InstallationId' }], get: { tags: ['Installations'], security: [{ bearerAuth: [] }], responses: { 200: { '$ref': '#/components/responses/Installation' } } }, put: { '$ref': '#/components/pathItems/MetadataPut' }, patch: { '$ref': '#/components/pathItems/MetadataPatch' }, delete: { '$ref': '#/components/pathItems/MetadataDelete' } },
    '/api/v1/installations/{installationId}/overview': { get: { tags: ['Installations'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/InstallationId' }], responses: { 200: { description: 'Installation and last known reading' } } } },
    '/api/v1/installations/{installationId}/last-known-reading': { get: { tags: ['Readings'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/InstallationId' }], responses: { 200: { '$ref': '#/components/responses/Reading' }, 404: { '$ref': '#/components/responses/Error' } } } },
    '/api/v1/installations/{installationId}/readings': { get: { tags: ['Readings'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/InstallationId' }, { '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }, { '$ref': '#/components/parameters/From' }, { '$ref': '#/components/parameters/To' }, { '$ref': '#/components/parameters/Order' }], responses: { 200: { '$ref': '#/components/responses/ReadingPage' } } }, post: { tags: ['Readings'], security: [{ bearerAuth: [] }], requestBody: { '$ref': '#/components/requestBodies/Reading' }, responses: { 201: { description: 'Reading accepted with Location' }, 409: { '$ref': '#/components/responses/Error' } } } },
    '/api/v1/installations/{installationId}/readings/{readingId}': { get: { tags: ['Readings'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/InstallationId' }, { '$ref': '#/components/parameters/ReadingId' }], responses: { 200: { '$ref': '#/components/responses/Reading' } } } },
    '/api/v1/readings': { get: { tags: ['Readings'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/Page' }, { '$ref': '#/components/parameters/Limit' }, { '$ref': '#/components/parameters/ProvinceFilter' }, { '$ref': '#/components/parameters/DistrictFilter' }, { '$ref': '#/components/parameters/SubstationFilter' }, { '$ref': '#/components/parameters/From' }, { '$ref': '#/components/parameters/To' }, { '$ref': '#/components/parameters/Order' }], responses: { 200: { '$ref': '#/components/responses/ReadingPage' } } } },
    '/api/v1/districts/{districtId}/generation-summary': { get: { tags: ['Summaries'], security: [{ bearerAuth: [] }], parameters: [{ '$ref': '#/components/parameters/DistrictId' }], responses: { 200: { description: 'Scoped district generation summary' }, 404: { '$ref': '#/components/responses/Error' } } } }
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    parameters: {
      Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
      Limit: { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
      Order: { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
      From: { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
      To: { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
      ProvinceFilter: { name: 'provinceId', in: 'query', schema: { type: 'string', format: 'uuid' } },
      DistrictFilter: { name: 'districtId', in: 'query', schema: { type: 'string', format: 'uuid' } },
      SubstationFilter: { name: 'substationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
      ProvinceId: { name: 'provinceId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      DistrictId: { name: 'districtId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      SubstationId: { name: 'substationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      InstallationId: { name: 'installationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ReadingId: { name: 'readingId', in: 'path', required: true, schema: { type: 'integer' } }
    },
    requestBodies: {
      Province: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['code', 'name'], properties: { code: { type: 'string' }, name: { type: 'string' } } } } } },
      Reading: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ReadingInput' } } } }
    },
    pathItems: {
      MetadataPost: { tags: ['Maintenance'], security: [{ bearerAuth: [] }], requestBody: { '$ref': '#/components/requestBodies/Province' }, responses: { 201: { description: 'Created' }, 403: { '$ref': '#/components/responses/Error' } } },
      MetadataPut: { tags: ['Maintenance'], security: [{ bearerAuth: [] }], parameters: [{ name: 'If-Match', in: 'header', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Replaced' }, 412: { '$ref': '#/components/responses/Error' } } },
      MetadataPatch: { tags: ['Maintenance'], security: [{ bearerAuth: [] }], parameters: [{ name: 'If-Match', in: 'header', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' }, 412: { '$ref': '#/components/responses/Error' } } },
      MetadataDelete: { tags: ['Maintenance'], security: [{ bearerAuth: [] }], parameters: [{ name: 'If-Match', in: 'header', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Soft-deleted; retained history is not cascaded' }, 412: { '$ref': '#/components/responses/Error' } } }
    },
    schemas: {
      UserLogin: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } },
      DeviceLogin: { type: 'object', required: ['deviceUsername', 'deviceSecret'], properties: { deviceUsername: { type: 'string' }, deviceSecret: { type: 'string', format: 'password' } } },
      ReadingInput: { type: 'object', required: ['measuredAt', 'powerKw', 'cumulativeEnergyKwh', 'voltageV'], properties: { measuredAt: { type: 'string', format: 'date-time' }, powerKw: { type: 'number', minimum: 0 }, cumulativeEnergyKwh: { type: 'number', minimum: 0 }, voltageV: { type: 'number', minimum: 0 }, meterReset: { type: 'boolean' } } },
      Error: { type: 'object', required: ['error', 'requestId'], properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } }, requestId: { type: 'string' } } }
    },
    responses: {
      Error: { description: 'Consistent JSON error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
      Province: { description: 'Province' }, District: { description: 'District' }, Substation: { description: 'Grid substation' }, Installation: { description: 'Solar installation' }, Reading: { description: 'Generation reading' },
      ProvincePage: { description: 'Paginated provinces' }, DistrictPage: { description: 'Paginated districts' }, SubstationPage: { description: 'Paginated substations' }, InstallationPage: { description: 'Paginated installations' }, ReadingPage: { description: 'Paginated readings' }
    }
  }
};
