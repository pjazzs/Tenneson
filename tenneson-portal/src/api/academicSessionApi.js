import api from "./axios";

/*
|--------------------------------------------------------------------------
| ACADEMIC SESSION API
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET ALL ACADEMIC SESSIONS
|--------------------------------------------------------------------------
*/

export const getAcademicSessions = async () => {
  const response = await api.get("/academic-sessions");

  return response.data;
};

/*
|--------------------------------------------------------------------------
| GET ONE ACADEMIC SESSION
|--------------------------------------------------------------------------
*/

export const getAcademicSession = async (id) => {
  const response = await api.get(`/academic-sessions/${id}`);

  return response.data;
};

/*
|--------------------------------------------------------------------------
| CREATE ACADEMIC SESSION
|--------------------------------------------------------------------------
*/

export const createAcademicSession = async (payload) => {
  const response = await api.post("/academic-sessions", payload);

  return response.data;
};

/*
|--------------------------------------------------------------------------
| UPDATE ACADEMIC SESSION
|--------------------------------------------------------------------------
*/

export const updateAcademicSession = async (id, payload) => {
  const response = await api.put(`/academic-sessions/${id}`, payload);

  return response.data;
};
