import { asyncHandler } from '../../middleware/errors.js';
import { parseId } from '../../shared/validation/schemas.js';
import { latestDate, sendRepresentation } from '../../shared/http/route-tools.js';
import { summaryService } from './summary.service.js';

export const summaryController = {
  districtGeneration: asyncHandler(async (req, res) => {
    const districtId = parseId(req.params.districtId, 'districtId');
    const result = await summaryService.districtGeneration(req.auth, districtId);
    return sendRepresentation(req, res, result.value, { lastModified: latestDate(result.district.updatedAt, result.asOf) });
  })
};
