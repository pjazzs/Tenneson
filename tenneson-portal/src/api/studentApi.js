import axios from "axios";

const studentApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

studentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("studentToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default studentApi;
