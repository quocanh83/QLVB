import { createSlice } from "@reduxjs/toolkit";
import { getNotifications, markRead, markAllRead } from "./thunk";

export const initialState = {
    notifications: [],
    error: {},
};

const NotificationSlice = createSlice({
    name: "Notifications",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getNotifications.fulfilled, (state, action) => {
            state.notifications = action.payload;
        });
        builder.addCase(getNotifications.rejected, (state, action) => {
            state.error = action.payload;
        });
        builder.addCase(markRead.fulfilled, (state, action) => {
            state.notifications = state.notifications.map(notification =>
                notification.id === action.payload.id ? { ...notification, is_read: true } : notification
            );
        });
        builder.addCase(markAllRead.fulfilled, (state) => {
            state.notifications = state.notifications.map(notification => ({ ...notification, is_read: true }));
        });
    },
});

export default NotificationSlice.reducer;
