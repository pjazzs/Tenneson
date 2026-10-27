import axios from "axios";

const studentApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

studentApi.interceptors.request.use(
  (config) => {
    // Preserve an Authorization header explicitly supplied
    // by the calling request, especially the first-login
    // password-change token.
    const hasExplicitAuthorization = Boolean(
      config.headers?.Authorization || config.headers?.authorization,
    );

    if (hasExplicitAuthorization) {
      return config;
    }

    // Automatically attach the normal student token only
    // when the request has not supplied its own token.
    const token = localStorage.getItem("studentToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

export default studentApi;
