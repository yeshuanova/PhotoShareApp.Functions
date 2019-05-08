# PhotoShareApp - Firebase Function

PhotoShareApp 的 Firebase function code 部分，主要功能

- 圖片上傳到 Storage 後後觸發 `upload_origin_image` function 對圖片進行縮圖等影像處理。
- 呼叫 Google API 對圖片進行標籤。
- 將 image post 與 image infomation 寫入 [Firebase Database](https://firebase.google.com/docs/database/) 中。

## Steps

- 安裝 firebase-tools

```bash
npm install -g firebase-tools
```

- 登入 Firebase

```bash
firebase login
```

- 初始化 Firebase function project

```bash
firebase init functions
```

- 將此 repo 的 `functions/` 資料夾中的 `index.js` 與 `package.json` 檔案複製到新 project folder 中。

- 部署 functions 到 Firebase

```bash
firebase deploy --only functions
```

- 可到 Firebase 視窗介面中查看是否部署成功。

- 將圖片手動上傳至 `photos/upload/` 資料夾中，並觀看 Log 查看執行狀況以及是否有更新圖片到 Storage 中的 `photos/raw` 以及 `photos/thumbnail` 資料夾中

## Google Vision API

因有使用到 [Google Vision API](https://cloud.google.com/vision/?hl=zh-tw) 的 Label detection 功能，因此需在 Google Cloud Console 專案中開啟 Cloud Vision API 還才能使用 Label 功能。

> 需注意不論是 Vision API 或 Firebase Storage 等都有一定[免費額度](https://cloud.google.com/vision/pricing?hl=zh-TW)，超過就要付費。

## Reference

- [Get started: write and deploy your first functions](https://firebase.google.com/docs/functions/get-started)
