import axios from "axios";

const teacherApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

teacherApi.interceptors.request.use(
  (config) => {
    // Preserve explicitly supplied tokens, especially
    // the temporary first-login password-change token.
    const hasExplicitAuthorization = Boolean(
      config.headers?.Authorization || config.headers?.authorization,
    );

    if (hasExplicitAuthorization) {
      return config;
    }

    const token = localStorage.getItem("teacherToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default teacherApi;
