// app/page.js
"use client"; // 標記為客戶端組件，因為有互動和狀態

import { useState } from "react";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDownloadLink(null);
    setFileName("");

    if (!url.trim()) {
      setError("Please enter a YouTube URL.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/download", {
        // 這裡會指向 Vercel 部署的 Python Serverless Function
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "An unknown error occurred during download.",
        }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // 從 Content-Disposition header 獲取檔名
      const disposition = response.headers.get("content-disposition");
      let suggestedFilename = "audio.mp3"; // 預設檔名
      if (disposition && disposition.includes("filename=")) {
        // 簡單的解析，實際應用可能需要更可靠的解析方式
        const match = disposition.match(
          /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i
        );
        if (match && match[1]) {
          suggestedFilename = decodeURIComponent(match[1]);
        }
      }
      setFileName(suggestedFilename);

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      setDownloadLink(downloadUrl);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to download audio. Please check the URL and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadLink) {
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = fileName || "youtube_audio.mp3"; // 使用伺服器提供的檔名或預設
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadLink); // 清理
      setDownloadLink(null); // 重置下載連結
      setUrl(""); // 清空輸入框
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-red-500 mb-8">
          YouTube to MP3 Converter
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="youtube-url"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              YouTube Video URL
            </label>
            <input
              type="url"
              id="youtube-url"
              name="youtube-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-red-500 focus:border-red-500 placeholder-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              "Convert to MP3"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-3 bg-red-700 bg-opacity-50 text-red-300 border border-red-600 rounded-md text-sm">
            <p>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {downloadLink && !isLoading && (
          <div className="mt-6 text-center">
            <p className="text-green-400 mb-2">Your MP3 is ready!</p>
            <button
              onClick={handleDownload}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Download &quot;{fileName || "audio.mp3"}&quot;
            </button>
          </div>
        )}
      </div>
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>
          &copy; {new Date().getFullYear()} Your Awesome Company. For
          educational purposes only.
        </p>
        <p>Please respect copyright laws.</p>
      </footer>
    </div>
  );
}
