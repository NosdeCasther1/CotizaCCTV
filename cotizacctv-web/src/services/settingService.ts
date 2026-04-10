import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const getSettings = async (): Promise<Record<string, string>> => {
  const response = await axios.get(`${API_URL}/settings`);
  return response.data;
};
