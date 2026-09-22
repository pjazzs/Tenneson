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
