import { createContext, useContext } from "react";

export interface ThemeContextValue {
  theme: "light" | "dark";
  toggle: () => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
  toggleTheme: () => {},
  isDark: false,
});

export const useAppTheme = () => useContext(ThemeContext);
