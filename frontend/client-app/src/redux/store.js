import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storageSession from "redux-persist/lib/storage/session";
import userReducer from "./userSlice";

const persistConfig = {
  key: "root",
  storage: storageSession, // session based persistence
};

const persistedReducer = persistReducer(persistConfig, userReducer);

// Redux store
const store = configureStore({
  reducer: {
    user: persistedReducer,
  },
});
const persistor = persistStore(store);

export { store, persistor };
