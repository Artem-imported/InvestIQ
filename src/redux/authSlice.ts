import { createSlice } from "@reduxjs/toolkit";

interface AuthState {
  isLogged: boolean;
  email: string | null;
}

const initialState: AuthState = {
  isLogged: false,
  email: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action) {
      state.isLogged = true;
      state.email = action.payload;
    },

    logout(state) {
      state.isLogged = false;
      state.email = null;
    },
  },
});

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;