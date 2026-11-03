import api from "./axios";

/*
|--------------------------------------------------------------------------
| ADMIN SUBJECT RESULT CORRECTION REQUESTS
|--------------------------------------------------------------------------
*/

/**
 * Get subject correction requests.
 *
 * Supported filters:
 * status, academicSessionId, term,
 * resultRevisionId, page, limit.
 *
 * Defaults to submitted requests awaiting admin review.
 */
export const getSubjectResultCorrectionRequests = async (params = {}) => {
  const response = await api.get("/subject-result-correction-requests", {
    params,
  });

  return response.data;
};

/**
 * Get one subject correction request.
 */
export const getSubjectResultCorrectionRequest = async (requestId) => {
  const response = await api.get(
    `/subject-result-correction-requests/${requestId}`,
  );

  return response.data;
};

/**
 * Accept a teacher's proposed correction.
 *
 * The optional note is saved as the admin review note.
 * Acceptance merges the proposed score into the parent
 * ResultRevision. It does not publish the result.
 */
export const acceptSubjectResultCorrectionRequest = async (
  requestId,
  note = "",
) => {
  const response = await api.patch(
    `/subject-result-correction-requests/${requestId}/accept`,
    { note },
  );

  return response.data;
};

/**
 * Return a teacher's proposed correction.
 *
 * A reason is mandatory.
 * The teacher can then revise and resubmit the request.
 */
export const returnSubjectResultCorrectionRequest = async (
  requestId,
  reason,
) => {
  const response = await api.patch(
    `/subject-result-correction-requests/${requestId}/return`,
    { reason },
  );

  return response.data;
};
