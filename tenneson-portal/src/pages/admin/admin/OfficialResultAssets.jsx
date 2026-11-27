import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaCloudUploadAlt,
  FaStamp,
  FaPenFancy,
  FaSyncAlt,
} from "react-icons/fa";

function OfficialResultAssets() {
  const [assets, setAssets] = useState({
    stamp: { url: "", publicId: "" },
    signature: { url: "", publicId: "" },
  });

  const [files, setFiles] = useState({
    stamp: null,
    signature: null,
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAssets = async () => {
    setError("");

    try {
      const response = await api.get("/official-result-assets");

      setAssets(
        response.data.assets || {
          stamp: { url: "", publicId: "" },
          signature: { url: "", publicId: "" },
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load official result assets.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      try {
        const response = await api.get("/official-result-assets");

        if (!cancelled) {
          setAssets(
            response.data.assets || {
              stamp: { url: "", publicId: "" },
              signature: { url: "", publicId: "" },
            },
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load official result assets.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (type, file) => {
    setError("");
    setSuccess("");

    if (!file) {
      setFiles((previous) => ({
        ...previous,
        [type]: null,
      }));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, JPEG and PNG images are allowed.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("The image must not exceed 3 MB.");
      return;
    }

    setFiles((previous) => ({
      ...previous,
      [type]: file,
    }));
  };

  const handleUpload = async (type) => {
    const file = files[type];

    if (!file) {
      setError(`Please select a ${type} image first.`);
      return;
    }

    const formData = new FormData();
    formData.append("asset", file);

    setUploading(type);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(
        `/official-result-assets/${type}`,
        formData,
      );

      setSuccess(response.data.message);
      setFiles((previous) => ({
        ...previous,
        [type]: null,
      }));

      await fetchAssets();
    } catch (err) {
      setError(
        err.response?.data?.message || `Unable to upload the official ${type}.`,
      );
    } finally {
      setUploading("");
    }
  };

  const renderAssetCard = (type, label, Icon) => {
    const asset = assets[type];
    const selectedFile = files[type];

    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-blue-600/20 text-blue-400 p-3 rounded-lg">
            <Icon size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-lg">{label}</h3>
            <p className="text-gray-400 text-sm">
              {asset?.url ? "Asset currently configured" : "No asset uploaded"}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg h-48 flex items-center justify-center overflow-hidden mb-4">
          {selectedFile ? (
            <img
              src={URL.createObjectURL(selectedFile)}
              alt={`Selected ${label}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : asset?.url ? (
            <img
              src={asset.url}
              alt={`Official ${label}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="text-gray-500 text-sm">
              No {label.toLowerCase()} available
            </p>
          )}
        </div>

        <label className="block text-sm font-medium mb-2">
          Select new image
        </label>

        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(event) =>
            handleFileChange(type, event.target.files?.[0] || null)
          }
          className="block w-full text-sm text-gray-300
            file:mr-3 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700"
        />

        <p className="text-xs text-gray-500 mt-2">
          JPG, JPEG or PNG. Maximum size: 3 MB.
        </p>

        <button
          type="button"
          onClick={() => handleUpload(type)}
          disabled={!selectedFile || uploading !== ""}
          className="mt-5 w-full flex items-center justify-center gap-2
            bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600
            disabled:cursor-not-allowed text-white font-medium
            py-3 rounded-lg transition"
        >
          {uploading === type ? (
            <>
              <FaSyncAlt className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FaCloudUploadAlt />
              {asset?.url ? "Replace" : "Upload"} {label}
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Official Result Assets</h1>

        <p className="text-gray-400 mt-2">
          Manage the school's official stamp and signature used on downloadable
          student results.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg mb-5">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 p-4 rounded-lg mb-5">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">
          Loading official result assets...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderAssetCard("stamp", "School Stamp", FaStamp)}
            {renderAssetCard("signature", "Proprietor's Signature", FaPenFancy)}
          </div>

          <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h3 className="font-semibold mb-2">Asset management information</h3>

            <p className="text-gray-400 text-sm">
              Replacing an asset affects newly generated official result
              documents. Previously issued documents retain their recorded asset
              references.
            </p>

            <p className="text-gray-500 text-xs mt-3">
              Asset version: {assets.assetVersion || 1}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default OfficialResultAssets;
