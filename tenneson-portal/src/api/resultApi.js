import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Results
|--------------------------------------------------------------------------
*/

export const getResults = async (params = {}) => {
  const response = await api.get("/results", {
    params,
  });

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
| Result Workflow Actions
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
  const response = await api.patch(`/results/${id}/publish`, { confirm: true });
  return response.data;
};
