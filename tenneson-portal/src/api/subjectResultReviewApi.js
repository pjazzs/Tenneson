import api from "./axios";

/*
|--------------------------------------------------------------------------
| SUBJECT RESULT REVIEW API
|--------------------------------------------------------------------------
|
| Handles administrator review of teacher-submitted subject score sheets.
|
| This is separate from the official Result workflow.
|
*/

/*
|--------------------------------------------------------------------------
| GET SUBJECT RESULT SUBMISSIONS
|--------------------------------------------------------------------------
*/

export const getSubjectResultSubmissions = async (params = {}) => {
  const response = await api.get("/subject-result-submissions", {
    params,
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| GET ONE SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
*/

export const getSubjectResultSubmission = async (id) => {
  const response = await api.get(`/subject-result-submissions/${id}`);

  return response.data;
};

/*
|--------------------------------------------------------------------------
| APPROVE SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
*/

export const approveSubjectResultSubmission = async (id) => {
  const response = await api.patch(`/subject-result-submissions/${id}/approve`);

  return response.data;
};

/*
|--------------------------------------------------------------------------
| REJECT SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
*/

export const rejectSubjectResultSubmission = async (id, reason) => {
  const response = await api.patch(`/subject-result-submissions/${id}/reject`, {
    reason,
  });

  return response.data;
};
