export function extractCompanyId(request: any): string | null {
  if (request.params?.companyId) {
    return request.params.companyId;
  }
  if (request.params?.id && (request.route?.path?.includes('/companies/:id') || request.url?.includes('/companies/'))) {
    return request.params.id;
  }
  if (request.query?.companyId) {
    return request.query.companyId;
  }
  if (request.headers?.['x-company-id']) {
    return request.headers['x-company-id'];
  }
  if (request.body?.companyId) {
    return request.body.companyId;
  }
  return null;
}
