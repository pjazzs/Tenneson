import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Results
|--------------------------------------------------------------------------
*/

export const getResults = async (params = {}) => {
  const response = await api.get("/results", { params });
  return response.data;
};

/*
|--------------------------------------------------------------------------
| Get Single Result
|--------------------------------------------------------------------------
*/

export const getResult = async (id) => {
  const response = await api.get(`/results/${id}`);
  return response.data;
};

/*
|--------------------------------------------------------------------------
| Create Result
|--------------------------------------------------------------------------
*/

export const createResult = async (payload) => {
  const response = await api.post("/results", payload);
  return response.data;
};

/*
|--------------------------------------------------------------------------
| Update Result
|--------------------------------------------------------------------------
*/

export const updateResult = async (id, payload) => {
  const response = await api.put(`/results/${id}`, payload);
  return response.data;
};

/*
|--------------------------------------------------------------------------
| Standard Result Workflow Actions
|--------------------------------------------------------------------------
*/

export const submitResult = async (id) => {
  const response = await api.patch(`/results/${id}/submit`);
  return response.data;
};

export const approveResult = async (id, payload) => {
  const response = await api.patch(`/results/${id}/approve`, payload);
  return response.data;
};

export const updatePrincipalComment = async (id, principal) => {
  const response = await api.patch(`/results/${id}/principal-comment`, {
    principal,
  });
  return response.data;
};

export const publishResult = async (id) => {
  const response = await api.patch(`/results/${id}/publish`, {
    confirm: true,
  });
  return response.data;
};

/*
|--------------------------------------------------------------------------
| Published Result Correction Workflow
|--------------------------------------------------------------------------
| These endpoints operate on ResultRevision records.
| They do not use the standard result update/submit/approve endpoints.
|--------------------------------------------------------------------------
*/

/**
 * Get all correction revisions.
 *
 * Supports filters such as:
 * status, term, currentClass, academicSessionId,
 * studentId, search, page and limit.
 */
export const getResultCorrections = async (params = {}) => {
  const response = await api.get("/result-corrections", { params });
  return response.data;
};

/**
 * Create a correction draft for an existing published result.
 */
export const createResultCorrection = async (resultId, reason) => {
  const response = await api.post(`/results/${resultId}/corrections`, {
    reason,
  });

  return response.data;
};

/**
 * Get the active correction for a published result.
 */
export const getActiveResultCorrection = async (resultId) => {
  const response = await api.get(`/results/${resultId}/corrections/active`);

  return response.data;
};

/**
 * Get a specific correction revision.
 */
export const getResultCorrection = async (revisionId) => {
  const response = await api.get(`/result-corrections/${revisionId}`);

  return response.data;
};

/**
 * Update a correction draft.
 */
export const updateResultCorrection = async (revisionId, payload) => {
  const response = await api.put(`/result-corrections/${revisionId}`, payload);

  return response.data;
};

/**
 * Submit a correction for review.
 */
export const submitResultCorrection = async (revisionId) => {
  const response = await api.patch(`/result-corrections/${revisionId}/submit`);

  return response.data;
};

/**
 * Approve a submitted correction.
 */
export const approveResultCorrection = async (revisionId, payload) => {
  const response = await api.patch(
    `/result-corrections/${revisionId}/approve`,
    payload,
  );

  return response.data;
};

/**
 * Reject a submitted correction.
 */
export const rejectResultCorrection = async (revisionId, rejectionReason) => {
  const response = await api.patch(`/result-corrections/${revisionId}/reject`, {
    rejectionReason,
  });

  return response.data;
};

/**
 * Publish an approved correction.
 */
export const publishResultCorrection = async (revisionId) => {
  const response = await api.patch(
    `/result-corrections/${revisionId}/publish`,
    {
      confirm: true,
    },
  );

  return response.data;
};
