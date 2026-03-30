export const google = {
  API_KEY: "",
  CLIENT_ID: "",
  SECRET: "",
};

export const facebook = {
  APP_ID: "",
};

export const api = {
  API_URL: process.env.REACT_APP_API_URL !== undefined && process.env.REACT_APP_API_URL !== "" ? process.env.REACT_APP_API_URL : (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : ''),
};