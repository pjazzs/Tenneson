import { logout } from "../../utils/auth";
function Navbar() {
  return (
    <header className="bg-white shadow p-4 flex justify-between">
      <h2 className="font-semibold">
        Admin Dashboard
      </h2>

      <button
  onClick={logout}
  className="
    bg-red-600
    text-white
    px-4
    py-2
    rounded-lg
    hover:bg-red-700
  "
>
  Logout
</button>
    </header>
  );
}

export default Navbar;