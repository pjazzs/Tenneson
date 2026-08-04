export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("admin");

  window.location.href = "/login";
};