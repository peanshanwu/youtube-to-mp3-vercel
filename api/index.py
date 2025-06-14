from flask import Flask, request, jsonify, send_file
import yt_dlp
import os
import tempfile
import logging

# 設定日誌
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

# 建立臨時資料夾路徑 (在 Vercel 的 /tmp 是可寫的)
TEMP_DIR = tempfile.gettempdir()

@app.route('/api/download', methods=['POST'])
def download_audio():
    data = request.get_json()
    youtube_url = data.get('url')

    if not youtube_url:
        return jsonify({"error": "YouTube URL is required"}), 400

    try:
        # 確保臨時資料夾存在
        if not os.path.exists(TEMP_DIR):
            os.makedirs(TEMP_DIR)

        # 使用 yt-dlp 下載音訊
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(TEMP_DIR, '%(id)s.%(ext)s'), # 儲存到臨時資料夾
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192', # MP3 位元率
            }],
            'noplaylist': True, # 通常只處理單一影片
            'quiet': True, # 減少輸出
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(youtube_url, download=True)
            video_id = info_dict.get('id', 'audio')
            # yt-dlp 會自動將副檔名改為 mp3
            # 注意：檔名可能包含特殊字元，實際應用中可能需要清理
            file_path = os.path.join(TEMP_DIR, f"{video_id}.mp3")
            filename = f"{info_dict.get('title', video_id)}.mp3" # 使用影片標題作為檔名

        if not os.path.exists(file_path):
            logging.error(f"File not found after download attempt: {file_path}")
            return jsonify({"error": "Failed to download or convert audio. File not found."}), 500

        logging.info(f"File ready for sending: {file_path}")

        # 返回檔案
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=filename, # 設定下載時的檔名
            mimetype='audio/mpeg'
        )

        # 清理臨時檔案 (Vercel serverless function 執行完畢後環境會銷毀，但本地測試時有用)
        # 在 Vercel 上，可以考慮不手動刪除，依賴環境的清理機制
        # @response.call_on_close
        # def on_close():
        #     if os.path.exists(file_path):
        #         os.remove(file_path)
        #         logging.info(f"Temporary file {file_path} deleted.")

        return response

    except yt_dlp.utils.DownloadError as e:
        logging.error(f"yt-dlp DownloadError: {e}")
        # 嘗試從錯誤訊息中提取更友好的提示
        error_message = str(e)
        if "is not a valid URL" in error_message:
            return jsonify({"error": "Invalid YouTube URL provided."}), 400
        elif "Video unavailable" in error_message:
            return jsonify({"error": "The requested video is unavailable."}), 404
        return jsonify({"error": f"Error downloading or converting audio: {e}"}), 500
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return jsonify({"error": f"An unexpected server error occurred: {e}"}), 500

# 本地測試用 (Vercel 不需要這個)
if __name__ == '__main__':
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR)
    app.run(debug=True, port=5353) # 使用 5353 避免與 Next.js 的 3000 衝突