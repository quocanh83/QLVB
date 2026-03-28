import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { GET_NOTIFICATIONS, MARK_NOTIFICATION_READ, MARK_ALL_NOTIFICATIONS_READ } from "../../helpers/url_helper";

export const getNotifications = createAsyncThunk("notifications/getNotifications", async () => {
    try {
        const response = await axios.get(GET_NOTIFICATIONS);
        return response.data;
    } catch (error) {
        return error;
    }
});

export const markRead = createAsyncThunk("notifications/markRead", async (id) => {
    try {
        await axios.post(`${MARK_NOTIFICATION_READ}${id}/mark_read/`);
        return { id };
    } catch (error) {
        return error;
    }
});

export const markAllRead = createAsyncThunk("notifications/markAllRead", async () => {
    try {
        await axios.post(MARK_ALL_NOTIFICATIONS_READ);
        return {};
    } catch (error) {
        return error;
    }
});
