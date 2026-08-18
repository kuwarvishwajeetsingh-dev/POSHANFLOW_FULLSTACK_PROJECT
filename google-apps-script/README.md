# Suggestions to Google Drive

1. Sign in to the Google account `kuwarvishwajeetsingh@gmail.com` and open [script.google.com](https://script.google.com).
2. Create a new project, replace its default file contents with `suggestions.gs`, and save.
3. Select **Deploy → New deployment → Web app**. Set **Execute as** to yourself and **Who has access** to **Anyone**.
4. Authorize the requested Google Drive and Google Sheets permissions, then copy the Web App URL.
5. In `.env`, add `VITE_SUGGESTION_ENDPOINT="<your web app URL>"`, then redeploy the frontend.

The first valid submission creates a Google Sheet named **PoshanFlow Suggestions** in that Google Drive. Each form submission adds its time, email address, and message to the sheet.
