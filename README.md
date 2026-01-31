# Tanzschule


### Deployment Note
This project is configured to deploy the **frontend** to GitHub Pages (`public/` directory).
**Important**: GitHub Pages hosts static content only. The backend (`server.js`) and database will **not run** on GitHub Pages, so login and data fetching will fail in the deployed version unless the frontend is updated to point to a live backend URL hosted elsewhere (e.g., Render, Heroku).
