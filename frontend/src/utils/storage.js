// Safe localStorage wrapper for Safari Private Browsing / strict privacy mode
export const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeStorage] getItem("${key}") error:`, e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[safeStorage] setItem("${key}") error:`, e);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[safeStorage] removeItem("${key}") error:`, e);
    }
  }
};
