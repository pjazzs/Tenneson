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
